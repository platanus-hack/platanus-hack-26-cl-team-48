import { describe, expect, it } from "vitest";
import { openNodeDuckDb } from "./node.ts";

describe("Node DuckDB lifecycle", () => {
  it("opens a database through the public Node entry point", async () => {
    const database = await openNodeDuckDb();

    try {
      const table = await database.connection.query("SELECT 42 AS answer");

      expect(table.getChild("answer")?.get(0)).toBe(42);
    } finally {
      database.dispose();
    }
  });

  it("closes the connection when the database is disposed", async () => {
    const database = await openNodeDuckDb();
    await database.connection.query("SELECT 1");

    database.dispose();

    await expect(database.connection.query("SELECT 42 AS answer")).rejects.toThrow();
  });
});
