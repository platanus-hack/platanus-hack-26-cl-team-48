import { err, Flow, parse, type Result, type ValidationIssue } from "@nodomics/protocol";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

export type FlowFileError =
  | { readonly kind: "not-json" }
  | { readonly kind: "invalid"; readonly issues: ReadonlyArray<ValidationIssue> };

const SHARE_PREFIX = "#flow=";
const JSON_INDENT = 2;

export const serializeFlow = (flow: Flow): string => JSON.stringify(flow, null, JSON_INDENT);

/** Parses an untrusted `.nodo.json` text into a flow, once, at the boundary. */
export function parseFlowFile(text: string): Result<Flow, FlowFileError> {
  const json = parseJson(text);
  if (!json.ok) return json;
  const flow = parse(Flow, json.value);
  return flow.ok ? flow : err({ kind: "invalid", issues: flow.error });
}

export const encodeSharedFlow = (flow: Flow): string =>
  `${SHARE_PREFIX}${compressToEncodedURIComponent(JSON.stringify(flow))}`;

/** `undefined` when the URL hash does not carry a shared flow at all. */
export function decodeSharedFlow(hash: string): Result<Flow, FlowFileError> | undefined {
  if (!hash.startsWith(SHARE_PREFIX)) return undefined;
  // lz-string answers null or "" for garbage despite its typings; both then fail to parse as a flow.
  return parseFlowFile(decompressFromEncodedURIComponent(hash.slice(SHARE_PREFIX.length)));
}

function parseJson(text: string): Result<unknown, FlowFileError> {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    // JSON.parse only reports malformed input by throwing.
    return err({ kind: "not-json" });
  }
}
