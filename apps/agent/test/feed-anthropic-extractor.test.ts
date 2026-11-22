import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { createAnthropicProfileExtractor } from "../src/feed/anthropic-profile-extractor.ts";
import { validCard } from "./feed-fixtures.ts";

type Reply = { content: unknown[]; stop_reason?: string };

function fakeClient(respond: () => Reply | Promise<Reply>) {
  const requests: Record<string, unknown>[] = [];
  const client = {
    messages: {
      create: (params: Record<string, unknown>) => {
        requests.push(params);
        return Promise.resolve().then(respond);
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
  return { client, requests };
}

const textReply = (text: string): Reply => ({
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
});

const userContent = (request: Record<string, unknown> | undefined): unknown[] => {
  const messages = request?.["messages"] as { content: unknown }[];
  const content = messages[0]?.content;
  return typeof content === "string" ? [{ type: "text", text: content }] : (content as unknown[]);
};

const userText = (request: Record<string, unknown> | undefined): string =>
  userContent(request)
    .filter((block) => (block as { type: string }).type === "text")
    .map((block) => (block as { text: string }).text)
    .join("\n");

const PNG_IMAGE = { mediaType: "image/png", base64: "iVBORw0KGgo=" } as const;
const JPEG_IMAGE = { mediaType: "image/jpeg", base64: "/9j/4AAQ" } as const;
const WEBP_IMAGE = { mediaType: "image/webp", base64: "UklGRg==" } as const;

describe("createAnthropicProfileExtractor", () => {
  it("returns the parsed JSON of the first text block", async () => {
    const card = validCard();
    const { client } = fakeClient(() => textReply(JSON.stringify(card)));

    const result = await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    expect(result).toEqual({ ok: true, value: card });
  });

  it("sends the claude-opus-5-5 model", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    expect(requests[0]?.["model"]).toBe("claude-opus-5-5");
  });

  it("requests a JSON schema output format", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    const format = (requests[0]?.["output_config"] as { format: { type: string } }).format;
    expect(format.type).toBe("json_schema");
  });

  it("puts the PDF as a document block before the text block", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ pdfBase64: "QUJD", text: "hi" });

    const content = userContent(requests[0]);
    expect(content[0]).toMatchObject({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: "QUJD" },
    });
    expect((content[1] as { type: string }).type).toBe("text");
  });

  it("includes the pasted text and the GitHub summary in the user text", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({
      text: "PASTED BIO",
      githubSummary: "GITHUB REPOS",
    });

    expect(userText(requests[0])).toContain("PASTED BIO");
    expect(userText(requests[0])).toContain("GITHUB REPOS");
  });

  it("sends no document block when there is no PDF", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    const types = userContent(requests[0]).map((block) => (block as { type: string }).type);
    expect(types).not.toContain("document");
  });

  it("never sends thinking or a thinking budget", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    expect(requests[0]).not.toHaveProperty("thinking");
    expect(JSON.stringify(requests[0])).not.toContain("budget_tokens");
  });

  it("returns REFUSED when the model refuses", async () => {
    const { client } = fakeClient(() => ({ content: [], stop_reason: "refusal" }));

    const result = await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REFUSED");
  });

  it("returns MALFORMED when the text is not JSON", async () => {
    const { client } = fakeClient(() => textReply("sorry, no json"));

    const result = await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MALFORMED");
  });

  it("sends each image as a base64 image block, in order, before the text block", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({
      images: [PNG_IMAGE, JPEG_IMAGE],
      text: "hi",
    });

    const content = userContent(requests[0]);
    expect(content).toHaveLength(3);
    expect(content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: PNG_IMAGE.base64 },
    });
    expect(content[1]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: JPEG_IMAGE.base64 },
    });
    expect((content[2] as { type: string }).type).toBe("text");
  });

  it("puts the image blocks after the PDF document block", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({
      pdfBase64: "QUJD",
      images: [WEBP_IMAGE],
      text: "hi",
    });

    const types = userContent(requests[0]).map((block) => (block as { type: string }).type);
    expect(types).toEqual(["document", "image", "text"]);
  });

  it("sends a text block when the only source is an image", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ images: [PNG_IMAGE] });

    const types = userContent(requests[0]).map((block) => (block as { type: string }).type);
    expect(types).toEqual(["image", "text"]);
  });

  it("sends no image block when there are no images", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ pdfBase64: "QUJD", text: "hi" });

    const types = userContent(requests[0]).map((block) => (block as { type: string }).type);
    expect(types).not.toContain("image");
  });

  it("includes the lookup summary in the user text", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({
      lookupSummary: "ALMACEN DON PEPE, GROCERIES IN VALPARAISO",
    });

    expect(userText(requests[0])).toContain("ALMACEN DON PEPE, GROCERIES IN VALPARAISO");
  });

  it("includes the lookup summary alongside the pasted text and the GitHub summary", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({
      text: "PASTED BIO",
      githubSummary: "GITHUB REPOS",
      lookupSummary: "BUSINESS LOOKUP",
    });

    const text = userText(requests[0]);
    expect(text).toContain("PASTED BIO");
    expect(text).toContain("GITHUB REPOS");
    expect(text).toContain("BUSINESS LOOKUP");
  });

  it("mentions photos and businesses in the system prompt", async () => {
    const { client, requests } = fakeClient(() => textReply("{}"));

    await createAnthropicProfileExtractor(client).extract({ images: [PNG_IMAGE] });

    const system = JSON.stringify(requests[0]?.["system"] ?? "").toLowerCase();
    expect(system).toContain("photo");
    expect(system).toContain("business");
  });

  it("returns UPSTREAM when the SDK throws", async () => {
    const { client } = fakeClient(() => Promise.reject(new Error("network down")));

    const result = await createAnthropicProfileExtractor(client).extract({ text: "hi" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UPSTREAM");
  });
});
