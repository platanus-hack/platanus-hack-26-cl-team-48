import { coreNodes } from "@nodomics/nodes-core";
import { err, Flow, ok, parse } from "@nodomics/protocol";
import type { UserIdentity } from "./identity.ts";
import { createMemoryStores } from "./memory-stores.ts";
import type { Runner, Sample } from "./runner.ts";
import type { FlowDocument, StoresFor } from "./stores.ts";
import { createTools, type ToolResult, type Tools } from "./tools.ts";

export const ALICE: UserIdentity = { userId: "alice", accessToken: "token-alice" };
export const BOB: UserIdentity = { userId: "bob", accessToken: "token-bob" };
export const NOW = 1_763_700_000_000;

export const SALES_FLOW: Flow = {
  format: "nodomics/flow@0",
  name: "Ventas mensuales",
  nodes: [
    {
      id: "src",
      type: "core.source.sample",
      version: "0.1.0",
      params: { dataset: "ventas" },
      position: { x: 0, y: 0 },
    },
    {
      id: "top",
      type: "core.limit",
      version: "0.1.0",
      params: { n: 10 },
      position: { x: 240, y: 0 },
    },
  ],
  edges: [{ id: "src-top", from: { node: "src", port: "out" }, to: { node: "top", port: "in" } }],
};

export const PYTHON_CODE = 'def run(inputs, params):\n    return {"out": inputs["in"]}\n';

export function salesDocument(flow: Flow = SALES_FLOW): FlowDocument {
  return {
    id: "ventas",
    name: "Ventas mensuales",
    flow,
    files: { "ventas.csv": "uploads/ventas.csv" },
    updatedAt: 1,
    published: true,
    node: { inputs: [], params: [] },
  };
}

export const RUN_RESULT = { nodes: [{ nodeId: "src", status: "ok", error: null }] } as const;

export const SAMPLE: Sample = {
  schema: { columns: [{ name: "mes", type: "VARCHAR" }] },
  rows: [{ mes: "enero" }],
  page: 0,
  hasMore: false,
};

export type RunnerCall =
  | { readonly method: "run"; readonly flow: Flow; readonly upTo: readonly string[] | undefined }
  | {
      readonly method: "sample";
      readonly flow: Flow;
      readonly request: { nodeId: string; port: string; page: number };
    }
  | { readonly method: "logs"; readonly flow: Flow; readonly nodeId: string };

export function createFakeRunner(failure?: string): {
  readonly runner: Runner;
  readonly calls: RunnerCall[];
} {
  const calls: RunnerCall[] = [];
  const fail = failure === undefined ? undefined : err({ message: failure });
  const runner: Runner = {
    run: (flow, upTo) => {
      calls.push({ method: "run", flow, upTo });
      return Promise.resolve(fail ?? ok(RUN_RESULT));
    },
    sample: (flow, request) => {
      calls.push({ method: "sample", flow, request });
      return Promise.resolve(fail ?? ok(SAMPLE));
    },
    logs: (flow, nodeId) => {
      calls.push({ method: "logs", flow, nodeId });
      return Promise.resolve(fail ?? ok({ nodeId, lines: ["hola"] }));
    },
  };
  return { runner, calls };
}

export type Harness = {
  readonly tools: Tools;
  readonly storesFor: StoresFor;
  readonly runnerCalls: readonly RunnerCall[];
  readonly call: (
    name: string,
    args: unknown,
    identity?: UserIdentity,
  ) => Promise<ToolResult | "unknown-tool" | "invalid-args">;
  readonly callOk: (name: string, args: unknown, identity?: UserIdentity) => Promise<unknown>;
  readonly callError: (name: string, args: unknown, identity?: UserIdentity) => Promise<string>;
  readonly createDraft: (flowId?: string, identity?: UserIdentity) => Promise<DraftRef>;
  readonly getFlow: (ref: { draftId?: string; flowId?: string }) => Promise<Flow>;
  readonly readDocument: (flowId: string, identity?: UserIdentity) => Promise<FlowDocument>;
};

export type DraftRef = {
  readonly draftId: string;
  readonly flowId: string;
  readonly baseRevision: string;
};

export function createHarness(
  options: {
    readonly flows?: readonly { readonly userId: string; readonly document: FlowDocument }[];
    readonly runnerFailure?: string;
  } = {},
): Harness {
  const storesFor = createMemoryStores({ flows: options.flows ?? [] });
  const fake = createFakeRunner(options.runnerFailure);
  const tools = createTools({
    storesFor,
    catalog: coreNodes,
    runner: fake.runner,
    createId: sequentialIds(),
    now: () => NOW,
  });
  const call = (name: string, args: unknown, identity: UserIdentity = ALICE) =>
    tools.call(name, args, identity);
  const callOk = async (name: string, args: unknown, identity: UserIdentity = ALICE) =>
    expectOk(name, await call(name, args, identity));
  const callError = async (name: string, args: unknown, identity: UserIdentity = ALICE) =>
    expectError(name, await call(name, args, identity));
  return {
    tools,
    storesFor,
    runnerCalls: fake.calls,
    call,
    callOk,
    callError,
    createDraft: async (flowId, identity) =>
      readDraftRef(
        await callOk("flows.create_draft", flowId === undefined ? {} : { flowId }, identity),
      ),
    getFlow: async (ref) => readFlow(await callOk("flows.get", ref)),
    readDocument: async (flowId, identity = ALICE) => {
      const read = await storesFor(identity).flows.read(flowId);
      if (!read.ok || read.value === undefined) throw new Error(`Flow "${flowId}" is not stored`);
      return read.value;
    },
  };
}

function sequentialIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `id-${String(next)}`;
  };
}

function expectOk(name: string, result: ToolResult | "unknown-tool" | "invalid-args"): unknown {
  if (typeof result === "string" || !result.ok) {
    throw new Error(`Expected ${name} to succeed, got ${JSON.stringify(result)}`);
  }
  return result.value;
}

function expectError(name: string, result: ToolResult | "unknown-tool" | "invalid-args"): string {
  if (typeof result === "string" || result.ok) {
    throw new Error(`Expected ${name} to fail with a message, got ${JSON.stringify(result)}`);
  }
  return result.error.message;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readDraftRef(value: unknown): DraftRef {
  if (
    isRecord(value) &&
    typeof value["draftId"] === "string" &&
    typeof value["flowId"] === "string" &&
    typeof value["baseRevision"] === "string"
  ) {
    return {
      draftId: value["draftId"],
      flowId: value["flowId"],
      baseRevision: value["baseRevision"],
    };
  }
  throw new Error(`Not a draft reference: ${JSON.stringify(value)}`);
}

function readFlow(value: unknown): Flow {
  const flow = parse(Flow, value);
  if (flow.ok) return flow.value;
  throw new Error(`Not a flow: ${JSON.stringify(value)}`);
}

export function readField(value: unknown, key: string): unknown {
  if (!isRecord(value)) throw new Error(`Not an object: ${JSON.stringify(value)}`);
  return value[key];
}
