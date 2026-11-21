import {
  NepRequests,
  PROTOCOL_VERSION,
  NepErrorCode,
  parse,
  type Capabilities,
  type ExecutorCapabilities,
} from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError, type RpcPeer } from "@nodomics/rpc";
import type { BrowserEngineOptions } from "./browser-engine-options.ts";

export function serveHello(
  peer: RpcPeer,
  options: BrowserEngineOptions | { readonly error: string },
): void {
  peer.handle("engine.hello", async (raw) => {
    if ("error" in options) throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, options.error);
    const params = parse(NepRequests["engine.hello"].params, raw);
    if (!params.ok)
      throw new RpcError(
        JsonRpcErrorCode.INVALID_PARAMS,
        "Invalid engine.hello params",
        params.error,
      );
    if (params.value.protocol.split(".").slice(0, 2).join(".") !== PROTOCOL_VERSION)
      throw new RpcError(NepErrorCode.PROTOCOL_MISMATCH, "Incompatible protocol", PROTOCOL_VERSION);
    return describeEngine(
      options,
      await Promise.all(options.executors.map((executor) => executor.request("exec.hello", {}))),
    );
  });
}

function describeEngine(
  options: BrowserEngineOptions,
  executors: ReadonlyArray<ExecutorCapabilities>,
): Capabilities {
  const python = executors.filter((executor) => executor.runtimes.includes("python"));
  const packages = python.flatMap((executor) => executor.packages ?? []);
  return {
    protocol: PROTOCOL_VERSION,
    engine: options.config.mode,
    runtimes: [...new Set(executors.flatMap((executor) => executor.runtimes))],
    ...(packages.length > 0 ? { pythonPackages: [...new Set(packages)] } : {}),
    sources: options.config.mode === "local" ? ["url", "upload", "path"] : ["url", "upload"],
    // Every Python executor completes code (ADR 0011); without one there is no code to complete.
    ...(python.length > 0 ? { codeCompletion: true } : {}),
  };
}
