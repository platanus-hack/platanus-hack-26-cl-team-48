import { err, ok, type NodeError, type Result } from "@nodomics/protocol";
import { requestUrl, type HttpRequest } from "./http-request.ts";
import { extractRecords } from "./records-path.ts";

/** The part of a `fetch` response the coordinator reads. */
export type FetchedResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
};

/** `fetch` as the coordinator uses it; injected so the core needs no platform API. */
export type Fetch = (
  url: string,
  init: { readonly headers: Readonly<Record<string, string>> },
) => Promise<FetchedResponse>;

/** The bytes to load for an API request: the response, or only its records when it is JSON. */
export async function fetchRequest(
  fetch: Fetch,
  request: HttpRequest,
): Promise<Result<Uint8Array, NodeError>> {
  const response = await send(fetch, request);
  if (!response.ok) return response;
  if (!response.value.ok)
    return err(apiError(`La API respondió con el estado ${String(response.value.status)}`));
  const bytes = new Uint8Array(await response.value.arrayBuffer());
  return request.format === "json" ? recordsOf(bytes, request.records ?? "") : ok(bytes);
}

async function send(
  fetch: Fetch,
  request: HttpRequest,
): Promise<Result<FetchedResponse, NodeError>> {
  // fetch reports network failures, CORS refusals included, only by rejecting.
  try {
    return ok(
      await fetch(requestUrl(request), {
        headers: Object.fromEntries(request.headers.map(({ name, value }) => [name, value])),
      }),
    );
  } catch (error) {
    return err({
      ...apiError("No se pudo contactar la API"),
      hint: CORS_HINT,
      detail: String(error),
    });
  }
}

function recordsOf(bytes: Uint8Array, path: string): Result<Uint8Array, NodeError> {
  const body = parseJson(new TextDecoder().decode(bytes));
  if (!body.ok) return err(apiError("La API no respondió JSON válido"));
  const records = extractRecords(body.value, path);
  return records.ok
    ? ok(new TextEncoder().encode(JSON.stringify(records.value)))
    : err(apiError(records.error));
}

function parseJson(text: string): Result<unknown, undefined> {
  // JSON.parse only reports malformed input by throwing.
  try {
    return ok(JSON.parse(text));
  } catch {
    return err(undefined);
  }
}

const CORS_HINT =
  "Revisa la dirección. Si es correcta, la API puede no permitir lecturas desde el navegador (CORS).";

const apiError = (message: string): NodeError => ({ code: "SOURCE_UNREADABLE", message });
