import {
  err,
  ok,
  type ExecutorParams,
  type NepParams,
  type NepResult,
  type NodeError,
  type Result,
} from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import { executorAt, type EngineState, type PresetSource } from "./engine-state.ts";
import type { LocatedResult } from "./result-store.ts";
import { fetchRequest } from "./fetch-request.ts";
import type { HttpRequest } from "./http-request.ts";
import { sourceFormatOf } from "./source-format.ts";
import { findSqlExecutor } from "./sql-executor.ts";

type SourceLocation = ExecutorParams<"exec.load">["location"];
type SourceDescription = { readonly name: string; readonly location: SourceLocation };

/** `source.add`: loads a file into the SQL executor and registers it under a new source id. */
export async function addSource(
  state: EngineState,
  params: NepParams<"source.add">,
): Promise<NepResult<"source.add">> {
  const { name, location } = await describeSource(params);
  const format = sourceFormatOf(name);
  if (!format.ok) throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, format.error);
  const sourceId = state.createId("source");
  const loaded = await loadSource(state, sourceId, { format: format.value, location });
  if (!loaded.ok)
    throw new RpcError(JsonRpcErrorCode.INTERNAL_ERROR, loaded.error.message, loaded.error);
  return { sourceId, name };
}

/** Where a source's data lives, loading a preset source the first time it is read. */
export async function ensureSource(
  state: EngineState,
  sourceId: string,
): Promise<Result<LocatedResult, NodeError>> {
  const loaded = state.sources.get(sourceId);
  if (loaded !== undefined) return ok(loaded);
  const preset = state.presetSources[sourceId];
  return preset === undefined ? err(missingSource(sourceId)) : loadSource(state, sourceId, preset);
}

/** Where an API source's data lives, asking the API the first time the request is read. */
export async function ensureRequestedSource(
  state: EngineState,
  { sourceId, request }: { readonly sourceId: string; readonly request: HttpRequest },
): Promise<Result<LocatedResult, NodeError>> {
  const loaded = state.sources.get(sourceId);
  if (loaded !== undefined) return ok(loaded);
  if (state.fetch === undefined) return err(NO_FETCH);
  const bytes = await fetchRequest(state.fetch, request);
  if (!bytes.ok) return bytes;
  return loadSource(state, sourceId, {
    format: request.format,
    location: { kind: "bytes", bytes: bytes.value },
  });
}

const NO_FETCH: NodeError = {
  code: "RUNTIME_UNAVAILABLE",
  message: "Este motor no puede leer APIs",
};

async function loadSource(
  state: EngineState,
  sourceId: string,
  source: PresetSource,
): Promise<Result<LocatedResult, NodeError>> {
  const executor = await findSqlExecutor(state);
  if (!executor.ok) return executor;
  const loaded = await executorAt(state, executor.value).request("exec.load", {
    sourceId,
    ...source,
  });
  if (!loaded.ok) return err(loaded.error);
  const located = { executor: executor.value, ref: loaded.ref };
  state.sources.set(sourceId, located);
  state.store.remember(located);
  return ok(located);
}

async function describeSource(params: NepParams<"source.add">): Promise<SourceDescription> {
  switch (params.kind) {
    case "url":
      return {
        name: params.name ?? lastSegment(params.url),
        location: { kind: "url", url: params.url },
      };
    case "path":
      return { name: lastSegment(params.path), location: { kind: "path", path: params.path } };
    case "upload":
      return {
        name: params.name,
        location: { kind: "bytes", bytes: await readUploadBytes(params.file) },
      };
  }
}

/** Accepts the bytes themselves or a `Blob`/`File`, which is what a browser transfers. */
async function readUploadBytes(file: unknown): Promise<Uint8Array> {
  if (file instanceof Uint8Array) return file;
  if (file instanceof ArrayBuffer) return new Uint8Array(file);
  if (
    file !== null &&
    typeof file === "object" &&
    "arrayBuffer" in file &&
    typeof file.arrayBuffer === "function"
  ) {
    const buffer: unknown = await Reflect.apply(file.arrayBuffer, file, []);
    if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  }
  throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, "El archivo subido no se puede leer");
}

const lastSegment = (location: string): string =>
  location.split(/[?#]/)[0]?.split(/[/\\]/).filter(Boolean).pop() ?? location;

const missingSource = (sourceId: string): NodeError => ({
  code: "SOURCE_UNREADABLE",
  message: "La fuente de datos ya no está disponible",
  hint: "Vuelve a agregar el archivo",
  detail: `sourceId: ${sourceId}`,
});
