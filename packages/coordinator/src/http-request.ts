import { err, ok, parse, SourceFormat, type Result } from "@nodomics/protocol";
import { canonicalJson } from "./canonical-json.ts";
import { hashText } from "./hash-text.ts";

/** One query parameter or header; an item without value (a missing credential) is left out. */
export type RequestField = { readonly name: string; readonly value: string };

/** What the API node asks for (ADR 0017). Its source id is a hash of it, so equal requests share data. */
export type HttpRequest = {
  readonly url: string;
  readonly query: ReadonlyArray<RequestField>;
  readonly headers: ReadonlyArray<RequestField>;
  readonly format: SourceFormat;
  readonly records?: string;
};

type RequestOptions = Readonly<Record<string, unknown>>;

const DEFAULT_FORMAT: SourceFormat = "json";
const WEB_PROTOCOLS: ReadonlyArray<string> = ["http:", "https:"];

export function describeRequest(
  url: unknown,
  options: RequestOptions,
): Result<HttpRequest, string> {
  if (!isWebUrl(url)) return err(`${JSON.stringify(url)} no es una dirección http o https`);
  const format = parse(SourceFormat, options["format"] ?? DEFAULT_FORMAT);
  if (!format.ok) return err(`El formato ${JSON.stringify(options["format"])} no se puede leer`);
  const records = options["records"];
  return ok({
    url,
    query: fieldsOf(options["query"]),
    headers: fieldsOf(options["headers"]),
    format: format.value,
    ...(typeof records === "string" && records !== "" ? { records } : {}),
  });
}

export const requestSourceId = (request: HttpRequest): string =>
  `request_${hashText(canonicalJson(request))}`;

/** The URL with the query parameters appended to the ones it already has. */
export function requestUrl(request: HttpRequest): string {
  const url = new URL(request.url);
  request.query.forEach(({ name, value }) => {
    url.searchParams.append(name, value);
  });
  return url.toString();
}

function isWebUrl(url: unknown): url is string {
  if (typeof url !== "string" || !URL.canParse(url)) return false;
  return WEB_PROTOCOLS.includes(new URL(url).protocol);
}

const fieldsOf = (value: unknown): ReadonlyArray<RequestField> =>
  Array.isArray(value) ? value.flatMap(toField) : [];

function toField(item: unknown): ReadonlyArray<RequestField> {
  if (typeof item !== "object" || item === null) return [];
  const name = "name" in item ? item.name : undefined;
  const value = "value" in item ? item.value : undefined;
  return typeof name === "string" && name !== "" && typeof value === "string"
    ? [{ name, value }]
    : [];
}
