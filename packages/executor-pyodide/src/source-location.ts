import { err, ok, type ExecutorParams, type NodeError, type Result } from "@nodomics/protocol";

type SourceLocation = ExecutorParams<"exec.load">["location"];

/** Reads the bytes of a source; the browser has no file system, so a path cannot be read. */
export async function readSourceBytes(
  location: SourceLocation,
  fetch: (url: string) => Promise<Response>,
): Promise<Result<Uint8Array, NodeError>> {
  switch (location.kind) {
    case "bytes":
      return ok(location.bytes);
    case "url":
      return fetchBytes(location.url, fetch);
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
  url: string,
  fetch: (url: string) => Promise<Response>,
): Promise<Result<Uint8Array, NodeError>> {
  try {
    const response = await fetch(url);
    return response.ok
      ? ok(new Uint8Array(await response.arrayBuffer()))
      : err(downloadFailed(`${url}: HTTP ${String(response.status)}`));
  } catch (error) {
    return err(downloadFailed(String(error)));
  }
}

const downloadFailed = (detail: string): NodeError =>
  sourceUnreadable({ message: "No se pudo descargar el archivo.", detail });

export const sourceUnreadable = (error: Omit<NodeError, "code">): NodeError => ({
  code: "SOURCE_UNREADABLE",
  ...error,
});
