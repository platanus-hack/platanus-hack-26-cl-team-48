import { err, ok, type Result, type SourceFormat } from "@nodomics/protocol";

const FORMAT_BY_EXTENSION: Readonly<Record<string, SourceFormat>> = {
  csv: "csv",
  txt: "txt",
  parquet: "parquet",
  json: "json",
};

const EXTENSION = /\.([a-z0-9]+)(?:[?#].*)?$/i;

/** The format of a source file, read from the extension of its name, path or URL. */
export function sourceFormatOf(name: string): Result<SourceFormat, string> {
  const format = FORMAT_BY_EXTENSION[EXTENSION.exec(name)?.[1]?.toLowerCase() ?? ""];
  return format === undefined ? err(`No se reconoce el formato de "${name}"`) : ok(format);
}
