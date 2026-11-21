import { describeExecutorConformance } from "@nodomics/executor-conformance";
import { toExecutorPort } from "@nodomics/protocol";
import { loadPyodide } from "pyodide";
import { createPyodideExecutor } from "./pyodide-executor.ts";

describeExecutorConformance({
  name: "Pyodide",
  runtimes: ["python"],
  create: async () => toExecutorPort(await createPyodideExecutor({ pyodide: await loadPyodide() })),
});
