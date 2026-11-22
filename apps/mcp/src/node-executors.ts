import { readFile } from "node:fs/promises";
import { createDuckDbExecutor } from "@nodomics/executor-duckdb-wasm";
import { openNodeDuckDb } from "@nodomics/executor-duckdb-wasm/node";
import { createPyodideExecutor } from "@nodomics/executor-pyodide";
import { loadPyodide } from "@nodomics/executor-pyodide/node";
import { toExecutorPort, type InProcessExecutor } from "@nodomics/protocol";
import type { EngineRunnerDeps } from "./engine-runner.ts";

export function createNodeExecutors(options: {
  readonly withPython: boolean;
}): EngineRunnerDeps["createExecutors"] {
  let python: Promise<InProcessExecutor | undefined> | undefined;
  return async () => {
    const database = await openNodeDuckDb();
    try {
      const pyodide = options.withPython ? await (python ??= loadPython()) : undefined;
      return {
        executors: [
          toExecutorPort(createDuckDbExecutor({ ...database, fetch: fetchSource })),
          ...(pyodide === undefined ? [] : [toExecutorPort(pyodide)]),
        ],
        dispose: database.dispose,
      };
    } catch (error) {
      database.dispose();
      throw error;
    }
  };
}
async function loadPython(): Promise<InProcessExecutor | undefined> {
  try {
    return await createPyodideExecutor({ pyodide: await loadPyodide(), fetch: fetchSource });
  } catch {
    return undefined;
  }
}
export async function fetchSource(url: string): Promise<Response> {
  return new URL(url).protocol === "file:"
    ? new Response(await readFile(new URL(url)))
    : fetch(url);
}
