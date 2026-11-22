import type { AddressInfo } from "node:net";
import { FEED_PATHS } from "@nodomics/profile";
import { ok } from "@nodomics/protocol";
import { afterEach, expect, it } from "vitest";
import type { ExtractionSource, ProfileExtractorPort } from "../src/feed/profile-extractor.ts";
import { createRegistrationRoute } from "../src/feed/registration-route.ts";
import { MAX_BODY_BYTES, UPLOAD_MAX_BODY_BYTES } from "../src/http/guards/body-limit.ts";
import { createRouter } from "../src/http/router.ts";
import { createServer } from "../src/server.ts";
import { validCard } from "./feed-fixtures.ts";

const USER = { userId: "u1", accessToken: "jwt" };
const AUTH = { Authorization: "Bearer jwt", "Content-Type": "application/json" };
const PDF_BYTES = 100 * 1024;

const servers: ReturnType<typeof createServer>[] = [];

function setup() {
  const sources: ExtractionSource[] = [];
  const extractor: ProfileExtractorPort = {
    extract: (source) => {
      sources.push(source);
      return Promise.resolve(ok(validCard()));
    },
  };
  const route = createRegistrationRoute({
    extractor,
    github: { summarize: () => Promise.resolve(ok("GITHUB SUMMARY")) },
  });
  return { route, sources };
}

async function start(): Promise<{ base: string; sources: ExtractionSource[] }> {
  const { route, sources } = setup();
  const router = createRouter({
    identity: { resolve: () => Promise.resolve(ok(USER)) },
    routes: [route],
  });
  const server = createServer({ handleRequest: () => Promise.reject(new Error("unused")), router });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { base: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`, sources };
}

function largePdfBase64(): string {
  return Buffer.concat([Buffer.from("%PDF-1.4 "), Buffer.alloc(PDF_BYTES, 1)]).toString("base64");
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
  );
});

it("the registration route declares the upload body limit", () => {
  const { route } = setup();

  expect(route.maxBodyBytes).toBe(UPLOAD_MAX_BODY_BYTES);
});

it("a registration body larger than the standard limit reaches the extractor", async () => {
  const { base, sources } = await start();
  const pdfBase64 = largePdfBase64();
  const body = JSON.stringify({ pdfBase64 });
  expect(body.length).toBeGreaterThan(MAX_BODY_BYTES);

  const response = await fetch(`${base}${FEED_PATHS.registration}`, {
    method: "POST",
    headers: AUTH,
    body,
  });

  expect(await response.json()).toEqual({ card: validCard() });
  expect(response.status).toBe(200);
  expect(sources[0]?.pdfBase64).toBe(pdfBase64);
});
