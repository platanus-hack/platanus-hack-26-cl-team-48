import { parentPort } from "node:worker_threads";
import { coreNodes, sampleDatasets } from "@nodomics/nodes-core";
import { err, Flow, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { createEngineRunner } from "./engine-runner.ts";
import { createNodeExecutors, fetchSource } from "./node-executors.ts";
import type { Runner } from "./runner.ts";

// Python stays off until it can run isolated per user (ADR 0026 §6).
const runner = createEngineRunner({
  createExecutors: createNodeExecutors({ withPython: false }),
  catalog: coreNodes,
  presetSources: Object.fromEntries(
    Object.entries(sampleDatasets).map(([id, source]) => [
      id,
      { format: source.format, location: { kind: "url", url: source.url } },
    ]),
  ),
  fetch: fetchSource,
});

const Request = Type.Object({
  id: Type.Number(),
  method: Type.Union([Type.Literal("run"), Type.Literal("sample"), Type.Literal("logs")]),
  args: Type.Array(Type.Unknown()),
});
const UpTo = Type.Union([Type.Array(Type.String()), Type.Undefined()]);
const SampleRequest = Type.Object({
  nodeId: Type.String(),
  port: Type.String(),
  page: Type.Number(),
});

parentPort?.on("message", (message: unknown) => {
  if (!Value.Check(Request, message)) return;
  void answer(runner, message).then((result) => {
    parentPort?.postMessage({ id: message.id, result });
  });
});

async function answer(
  engine: Runner,
  { method, args: [flowArg, extra] }: { method: "run" | "sample" | "logs"; args: unknown[] },
): Promise<Result<unknown, { readonly message: string }>> {
  const flow = parse(Flow, flowArg);
  if (!flow.ok) return err({ message: "Invalid flow" });
  if (method === "run") return Value.Check(UpTo, extra) ? engine.run(flow.value, extra) : invalid();
  if (method === "sample")
    return Value.Check(SampleRequest, extra) ? engine.sample(flow.value, extra) : invalid();
  return typeof extra === "string" ? engine.logs(flow.value, extra) : invalid();
}

const invalid = () => err({ message: "Invalid run request" });
