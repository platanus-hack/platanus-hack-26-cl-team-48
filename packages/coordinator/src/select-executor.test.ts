import type { ExecutorCapabilities } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { selectExecutor } from "./select-executor.ts";

const sqlOnly: ExecutorCapabilities = { executor: "a", runtimes: ["sql"] };
const pythonBasic: ExecutorCapabilities = {
  executor: "b",
  runtimes: ["python"],
  packages: ["pandas"],
};
const pythonFull: ExecutorCapabilities = {
  executor: "c",
  runtimes: ["sql", "python"],
  packages: ["pandas", "scikit-learn"],
};

describe("selectExecutor", () => {
  it("picks the first executor that offers the runtime", () => {
    expect(selectExecutor({ runtime: "sql" }, [pythonBasic, sqlOnly, pythonFull])).toEqual({
      ok: true,
      value: 1,
    });
  });

  it("skips executors that lack a required package", () => {
    expect(
      selectExecutor({ runtime: "python", packages: ["scikit-learn"] }, [
        sqlOnly,
        pythonBasic,
        pythonFull,
      ]),
    ).toEqual({ ok: true, value: 2 });
  });

  it("returns RUNTIME_UNAVAILABLE when no executor is compatible", () => {
    expect(selectExecutor({ runtime: "python" }, [sqlOnly])).toMatchObject({
      ok: false,
      error: { code: "RUNTIME_UNAVAILABLE" },
    });
  });
});
