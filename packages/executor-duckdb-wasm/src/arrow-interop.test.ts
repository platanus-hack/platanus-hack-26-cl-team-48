import { encodePeopleTable } from "@nodomics/executor-conformance";
import { createPyodideExecutor } from "@nodomics/executor-pyodide";
import type { ExecutorResult, ResultRef } from "@nodomics/protocol";
import { loadPyodide } from "pyodide";
import { expect, it } from "vitest";
import { createDuckDbExecutor } from "./duckdb-executor.ts";
import { openNodeDuckDb } from "./open-node-duckdb.ts";

const STARTUP_TIMEOUT_MS = 300_000;
const Z_SCORE_CODE = [
  "def run(inputs, params):",
  "    scores = inputs['scores']",
  "    column = scores['score']",
  "    return {'out': scores.assign(z=(column - column.mean()) / column.std(ddof=0))}",
].join("\n");

const outputOf = (run: ExecutorResult<"exec.run">): ResultRef => {
  const out = run.ok ? run.outputs["out"] : undefined;
  if (out === undefined) throw new Error(`Task failed: ${JSON.stringify(run)}`);
  return out;
};

it(
  "moves a result from DuckDB to Pyodide and back through Arrow to compute a z-score",
  async () => {
    const duck = createDuckDbExecutor(await openNodeDuckDb()).handlers;
    const python = (await createPyodideExecutor({ pyodide: await loadPyodide() })).handlers;
    const people = await duck["exec.import"]({ arrow: encodePeopleTable() });
    const scores = outputOf(
      await duck["exec.run"]({
        taskId: "scores",
        task: {
          kind: "sql",
          query: "SELECT id, score FROM people WHERE score IS NOT NULL ORDER BY id",
          inputs: { people: people.id },
        },
      }),
    );

    const inPython = await python["exec.import"](
      await duck["exec.export"]({ resultId: scores.id }),
    );
    const zScores = outputOf(
      await python["exec.run"]({
        taskId: "z",
        task: {
          kind: "python",
          code: Z_SCORE_CODE,
          entry: "run",
          inputs: { scores: inPython.id },
          params: {},
        },
      }),
    );
    const back = await duck["exec.import"](await python["exec.export"]({ resultId: zScores.id }));
    const page = await duck["exec.page"]({ resultId: back.id, offset: 0, limit: 10 });

    expect(page.columns.map((column) => column.name)).toEqual(["id", "score", "z"]);
    expect(page.rows.map((row) => [row[0], Number(row[2]).toFixed(4)])).toEqual([
      [1, "1.4142"],
      [2, "-0.7071"],
      [4, "-0.7071"],
    ]);
  },
  STARTUP_TIMEOUT_MS,
);
