import { createDuckDbExecutor } from "@nodomics/executor-duckdb-wasm";
import { expect, it } from "vitest";
import { openNodeDuckDb } from "./node-duckdb.ts";

it("exports results as an Arrow stream that another executor can import", async () => {
  const database = await openNodeDuckDb();
  const { handlers } = createDuckDbExecutor(database);
  const loaded = await handlers["exec.load"]({
    sourceId: "numbers",
    format: "csv",
    location: { kind: "bytes", bytes: new TextEncoder().encode("n\n1\n2\n") },
  });
  if (!loaded.ok) throw new Error(loaded.error.message);

  const { arrow } = await handlers["exec.export"]({ resultId: loaded.ref.id });
  const imported = await handlers["exec.import"]({ arrow });

  expect(imported.rowCount).toBe(2);
  database.dispose();
});
