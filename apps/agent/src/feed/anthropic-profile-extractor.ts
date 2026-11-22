import type Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { ProfileCardSchema } from "@nodomics/profile";
import { err, ok, type Result } from "@nodomics/protocol";
import type { ExtractError, ExtractionSource, ProfileExtractorPort } from "./profile-extractor.ts";

const EXTRACTION_MODEL = "claude-opus-5-5";
const MAX_OUTPUT_TOKENS = 16000;
const DEFAULT_INSTRUCTION = "Propose the profile card.";

const SYSTEM_PROMPT = `You build a profile card for Nodomics, a place where people who work with data meet people who can help them.

Read the sources (a CV, pasted text, a GitHub summary) and propose one card:
- about: who the person is, a few sentences.
- technical: how they work with code. "uses" means they use tools without writing code, "builds" means they build with low-code or occasional scripts, "codes" means they program regularly.
- domains: the fields they know, each with a depth: curious, practitioner or expert.
- offers: concrete things they can help others with.
- seeks: concrete things they need help with. Offers and seeks are different axes: offers is what they give, seeks is what they look for. Leave seeks empty when the sources do not say.
- links: only the linkedin, github and website URLs that appear in the sources.

Write the card in the language of the CV (or of the main source when there is no CV).
Never invent facts: if the sources do not support a field, leave it out or empty.`;

/** TypeBox keeps symbol keys in its schemas; a JSON round trip leaves plain JSON for the API. */
const CARD_JSON_SCHEMA = JSON.parse(JSON.stringify(ProfileCardSchema)) as { type: "object" };

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export function createAnthropicProfileExtractor(
  client: Pick<Anthropic, "messages">,
): ProfileExtractorPort {
  return { extract: (source) => extractCard(client, source) };
}

async function extractCard(
  client: Pick<Anthropic, "messages">,
  source: ExtractionSource,
): Promise<Result<unknown, ExtractError>> {
  try {
    const message = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contentOf(source) }],
      output_config: { format: jsonSchemaOutputFormat(CARD_JSON_SCHEMA) },
    });
    if (message.stop_reason === "refusal")
      return err({ code: "REFUSED", message: "The model refused to read the sources." });
    return parseFirstText(message.content);
  } catch {
    return err({ code: "UPSTREAM", message: "The extraction request failed." });
  }
}

function contentOf(source: ExtractionSource): ContentBlock[] {
  const pdf: ContentBlock[] = source.pdfBase64
    ? [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: source.pdfBase64 },
        },
      ]
    : [];
  return [...pdf, { type: "text", text: instructionOf(source) }];
}

function instructionOf(source: ExtractionSource): string {
  const sections = [
    source.text === undefined ? undefined : `Pasted text:\n${source.text}`,
    source.githubSummary === undefined ? undefined : `GitHub summary:\n${source.githubSummary}`,
  ].filter((section) => section !== undefined);
  return sections.length === 0 ? DEFAULT_INSTRUCTION : sections.join("\n\n");
}

function parseFirstText(content: readonly { type: string }[]): Result<unknown, ExtractError> {
  const block = content.find((candidate) => candidate.type === "text") as
    { text: string } | undefined;
  try {
    return ok(JSON.parse(block?.text ?? "") as unknown);
  } catch {
    return err({ code: "MALFORMED", message: "The model did not return a JSON card." });
  }
}
