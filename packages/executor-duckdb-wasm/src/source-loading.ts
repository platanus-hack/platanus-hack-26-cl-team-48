import {
  err,
  ok,
  type ExecutorParams,
  type ExecutorResult,
  type NodeError,
  type Result,
  type SourceFormat,
} from "@nodomics/protocol";
import type { DuckDbFiles } from "./duckdb-port.ts";
import { createResultId, holdResult, type ResultTables } from "./result-tables.ts";
import { quoteIdentifier, quoteLiteral } from "./sql-identifiers.ts";
import { textSeparatorOf } from "./text-separator.ts";

const LINE_FEED_BYTE = 10;

const READERS: Readonly<Record<SourceFormat, string>> = {
  csv: "read_csv",
  parquet: "read_parquet",
  json: "read_json",
  txt: "read_csv",
};

type LoadParams = ExecutorParams<"exec.load">;
type SourceLocation = LoadParams["location"];

export type SourceAccess = {
  readonly files: DuckDbFiles;
  readonly fetch: (url: string) => Promise<Response>;
};

/** Reads a source file into a new result; a source that cannot be read is a node error value. */
export async function loadSource(
  tables: ResultTables,
  access: SourceAccess,
  params: LoadParams,
): Promise<ExecutorResult<"exec.load">> {
  const bytes = await readLocation(access, params.location);
  if (!bytes.ok) return bytes;
  const id = createResultId();
  const created = await createTableFromFile(tables, access, {
    id,
    format: params.format,
    bytes: bytes.value,
  });
  return created.ok ? { ok: true, ref: await holdResult(tables, id) } : created;
}

async function createTableFromFile(
  tables: ResultTables,
  access: SourceAccess,
  file: { readonly id: string; readonly format: SourceFormat; readonly bytes: Uint8Array },
): Promise<Result<void, NodeError>> {
  const fileName = `${file.id}.${file.format}`;
  await access.files.registerFileBuffer(fileName, file.bytes);
  try {
    await tables.connection.query(
      `CREATE TABLE ${quoteIdentifier(file.id)} AS SELECT * FROM ${sourceQuery(fileName, file)}`,
    );
    return ok(undefined);
  } catch (error) {
    return err(
      sourceUnreadable({
        message: "El archivo no tiene el formato esperado.",
        detail: String(error),
      }),
    );
  } finally {
    await access.files.dropFile(fileName);
  }
}

async function readLocation(
  access: SourceAccess,
  location: SourceLocation,
): Promise<Result<Uint8Array, NodeError>> {
  switch (location.kind) {
    case "bytes":
      return ok(location.bytes);
    case "url":
      return fetchBytes(access, location.url);
    case "path":
      return err(
        sourceUnreadable({
          message: "El navegador no puede leer archivos por ruta.",
          hint: "Sube el archivo o usa el motor local.",
          detail: location.path,
        }),
      );
  }
}

async function fetchBytes(
  access: SourceAccess,
  url: string,
): Promise<Result<Uint8Array, NodeError>> {
  try {
    const response = await access.fetch(url);
    return response.ok
      ? ok(new Uint8Array(await response.arrayBuffer()))
      : err(downloadFailed(`${url}: HTTP ${String(response.status)}`));
  } catch (error) {
    return err(downloadFailed(String(error)));
  }
}

const downloadFailed = (detail: string): NodeError =>
  sourceUnreadable({ message: "No se pudo descargar el archivo.", detail });

const sourceUnreadable = (error: Omit<NodeError, "code">): NodeError => ({
  code: "SOURCE_UNREADABLE",
  ...error,
});

function sourceQuery(
  fileName: string,
  file: { readonly format: SourceFormat; readonly bytes: Uint8Array },
): string {
  if (file.format !== "txt") return `${READERS[file.format]}(${quoteLiteral(fileName)})`;
  const separator = textSeparatorOf(file.bytes);
  return separator === undefined
    ? textLinesQuery(fileName, file.bytes)
    : `read_csv(${quoteLiteral(fileName)}, delim=${quoteLiteral(separator)}, header=true)`;
}

function textLinesQuery(fileName: string, bytes: Uint8Array): string {
  if (bytes.length === 0) return `(SELECT NULL::VARCHAR AS texto WHERE false)`;
  const content =
    bytes.at(-1) === LINE_FEED_BYTE ? "left(content, length(content) - 1)" : "content";
  return `(SELECT regexp_replace(unnest(string_split(${content}, chr(10))), chr(13) || '$', '') AS texto FROM read_text(${quoteLiteral(fileName)}))`;
}
