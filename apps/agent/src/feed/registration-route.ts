import { FEED_PATHS, parseProfileCard, RegistrationRequestSchema } from "@nodomics/profile";
import { parse } from "@nodomics/protocol";
import type { Route, RouteReply, RouteRequest } from "../http/route.ts";
import type { GithubSummaryPort } from "./github-summary.ts";
import type { ExtractionSource, ProfileExtractorPort } from "./profile-extractor.ts";
import { UPLOAD_MAX_BODY_BYTES } from "../http/guards/body-limit.ts";
import { parseJson } from "./parse-json.ts";

export type RegistrationRouteDeps = {
  readonly extractor: ProfileExtractorPort;
  readonly github: GithubSummaryPort;
};

export const MAX_TEXT_LENGTH = 20000;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
// A flat pattern: a grouped one overflows the regex stack on multi-megabyte payloads.
const BASE64_SHAPE_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const BASE64_QUARTET = 4;
const BASE64_BYTES_PER_CHAR = 3 / 4;
const PADDING_CHAR = "=";

const INVALID_INPUT: RouteReply = { status: 400, body: { error: "invalid_input" } };
const UPSTREAM_UNAVAILABLE: RouteReply = { status: 502, body: { error: "upstream_unavailable" } };
const GITHUB_NOT_FOUND: RouteReply = { status: 404, body: { error: "github_not_found" } };
const EXTRACTION_FAILED: RouteReply = { status: 422, body: { error: "extraction_failed" } };

export function createRegistrationRoute(deps: RegistrationRouteDeps): Route {
  return {
    method: "POST",
    path: FEED_PATHS.registration,
    maxBodyBytes: UPLOAD_MAX_BODY_BYTES,
    handle: (request) => handleRegistration(deps, request),
  };
}

type Input = { readonly pdfBase64?: string; readonly text?: string; readonly githubLogin?: string };

function decodedBytes(base64: string): number {
  const padding = base64.endsWith(PADDING_CHAR.repeat(2))
    ? 2
    : base64.endsWith(PADDING_CHAR)
      ? 1
      : 0;
  return base64.length * BASE64_BYTES_PER_CHAR - padding;
}

const isStrictBase64 = (value: string): boolean =>
  value.length % BASE64_QUARTET === 0 && BASE64_SHAPE_PATTERN.test(value);

const isValidPdf = (base64: string): boolean =>
  isStrictBase64(base64) && decodedBytes(base64) > 0 && decodedBytes(base64) <= MAX_PDF_BYTES;

function isWithinLimits(input: Input): boolean {
  const { pdfBase64, text, githubLogin } = input;
  if (pdfBase64 === undefined && text === undefined && githubLogin === undefined) return false;
  if (text !== undefined && text.length > MAX_TEXT_LENGTH) return false;
  return pdfBase64 === undefined || isValidPdf(pdfBase64);
}

async function handleRegistration(
  deps: RegistrationRouteDeps,
  request: RouteRequest,
): Promise<RouteReply> {
  const body = parseJson(request.rawBody);
  const input = body.ok ? parse(RegistrationRequestSchema, body.value) : undefined;
  if (!input?.ok || !isWithinLimits(input.value)) return INVALID_INPUT;
  const source = await readSources(deps.github, input.value);
  if (!source.ok) return source.reply;
  const extracted = await deps.extractor.extract(source.value);
  if (!extracted.ok)
    return extracted.error.code === "UPSTREAM" ? UPSTREAM_UNAVAILABLE : EXTRACTION_FAILED;
  const card = parseProfileCard(extracted.value);
  return card.ok
    ? { status: 200, body: { card: card.value } }
    : { status: 422, body: { error: "extraction_failed", issues: card.error } };
}

type Sources =
  | { readonly ok: true; readonly value: ExtractionSource }
  | { readonly ok: false; readonly reply: RouteReply };

async function readSources(github: GithubSummaryPort, input: Input): Promise<Sources> {
  const base: ExtractionSource = {
    ...(input.pdfBase64 === undefined ? {} : { pdfBase64: input.pdfBase64 }),
    ...(input.text === undefined ? {} : { text: input.text }),
  };
  if (input.githubLogin === undefined) return { ok: true, value: base };
  const summary = await github.summarize(input.githubLogin);
  if (summary.ok) return { ok: true, value: { ...base, githubSummary: summary.value } };
  const reply = summary.error.code === "NOT_FOUND" ? GITHUB_NOT_FOUND : UPSTREAM_UNAVAILABLE;
  return { ok: false, reply };
}
