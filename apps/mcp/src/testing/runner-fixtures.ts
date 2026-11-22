import {
  FLOW_FORMAT,
  type ExecutorPort,
  type Flow,
  type FlowNode,
  type NodeManifest,
  type Result,
} from "@nodomics/protocol";
import {
  createFakeExecutor,
  type FakeExecutor,
  type FakeExecutorOptions,
} from "./fake-executor.ts";

const tablePort = (id: string) => ({ id, type: "table" as const });

/** A source without inputs: its SQL is never parsed by the fake executors. */
export const rowsManifest: NodeManifest = {
  id: "test.rows",
  version: "0.1.0",
  name: "Filas",
  category: "Fuentes",
  inputs: [],
  outputs: [tablePort("out")],
  params: { type: "object", properties: {} },
  impl: { kind: "sql", template: "SELECT 'rows'" },
};

export const filterManifest: NodeManifest = {
  id: "test.filter",
  version: "0.1.0",
  name: "Filtrar",
  category: "Transformar",
  inputs: [tablePort("in")],
  outputs: [tablePort("out")],
  params: {
    type: "object",
    properties: { column: { type: "string" } },
    required: ["column"],
  },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} WHERE {{ident column}} > 0" },
};

export const pythonManifest: NodeManifest = {
  id: "test.python",
  version: "0.1.0",
  name: "Python",
  category: "Código",
  inputs: [tablePort("in")],
  outputs: [tablePort("out")],
  params: { type: "object", properties: {} },
  impl: { kind: "python", code: "def run(inputs, params):\n  return inputs", entry: "run" },
  requires: { runtime: "python" },
};

export const testCatalog: readonly NodeManifest[] = [rowsManifest, filterManifest, pythonManifest];

export const flowNode = (
  id: string,
  type: string,
  params: Readonly<Record<string, unknown>> = {},
): FlowNode => ({ id, type, version: "0.1.0", params: { ...params }, position: { x: 0, y: 0 } });

export const edge = (from: string, to: string): Flow["edges"][number] => ({
  id: `${from}-${to}`,
  from: { node: from, port: "out" },
  to: { node: to, port: "in" },
});

export const flowOf = (nodes: FlowNode[], edges: Flow["edges"], name?: string): Flow => ({
  format: FLOW_FORMAT,
  ...(name === undefined ? {} : { name }),
  nodes,
  edges,
});

/** A flow whose revision differs for every distinct `name`. */
export const namedFlow = (name: string): Flow => flowOf([flowNode("a", "test.rows")], [], name);

export type FakeEngineOptions = {
  readonly sql?: Omit<FakeExecutorOptions, "capabilities">;
  readonly python?: Omit<FakeExecutorOptions, "capabilities">;
  /** The error every `createExecutors` rejects with, if any. */
  readonly createFails?: Error;
};

export type ExecutorSet = { readonly sql: FakeExecutor; readonly python: FakeExecutor };

/** `createExecutors` backed by fake executors; it records every set it creates and disposes. */
export function createFakeEngine(options: FakeEngineOptions = {}) {
  const created: ExecutorSet[] = [];
  const disposed: number[] = [];
  const createExecutors = (): Promise<{
    readonly executors: readonly ExecutorPort[];
    readonly dispose: () => void;
  }> => {
    if (options.createFails !== undefined) return Promise.reject(options.createFails);
    const index = created.length;
    const set = {
      sql: createFakeExecutor({
        capabilities: { executor: "fake-sql", runtimes: ["sql"] },
        ...options.sql,
      }),
      python: createFakeExecutor({
        capabilities: { executor: "fake-py", runtimes: ["python"] },
        ...options.python,
      }),
    };
    created.push(set);
    return Promise.resolve({
      executors: [set.sql, set.python],
      dispose: () => {
        disposed.push(index);
      },
    });
  };
  return { createExecutors, created, disposed };
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}
