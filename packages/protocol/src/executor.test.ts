import { describe, expect, it } from "vitest";
import { ExecutorRequests } from "./executor.ts";
import { parse } from "./parse.ts";

describe("executor protocol", () => {
  it("accepts a resolved SQL task", () => {
    const params = {
      taskId: "t1",
      task: { kind: "sql", query: "SELECT * FROM in_0", inputs: { in_0: "r_1" } },
    };

    expect(parse(ExecutorRequests["exec.run"].params, params).ok).toBe(true);
  });

  it("returns node failures as values", () => {
    const failure = { ok: false, error: { code: "SQL_ERROR", message: "Error de sintaxis" } };

    expect(parse(ExecutorRequests["exec.run"].result, failure).ok).toBe(true);
  });

  it("returns one result reference per output port", () => {
    const success = {
      ok: true,
      outputs: { out: { id: "r_2", rowCount: 5, schema: [{ name: "z", type: "number" }] } },
    };

    expect(parse(ExecutorRequests["exec.run"].result, success).ok).toBe(true);
  });

  it("loads a source from bytes, a URL or a local path into a result", () => {
    const fromBytes = {
      sourceId: "s1",
      format: "csv",
      location: { kind: "bytes", bytes: new Uint8Array([97]) },
    };
    const fromPath = {
      sourceId: "s2",
      format: "parquet",
      location: { kind: "path", path: "/d.parquet" },
    };

    expect(parse(ExecutorRequests["exec.load"].params, fromBytes).ok).toBe(true);
    expect(parse(ExecutorRequests["exec.load"].params, fromPath).ok).toBe(true);
  });

  it("rejects a source in an unknown format", () => {
    const params = {
      sourceId: "s1",
      format: "xlsx",
      location: { kind: "url", url: "https://x/a" },
    };

    expect(parse(ExecutorRequests["exec.load"].params, params).ok).toBe(false);
  });

  it("returns an unreadable source as a node failure value", () => {
    const failure = { ok: false, error: { code: "SOURCE_UNREADABLE", message: "No se pudo leer" } };
    const success = { ok: true, ref: { id: "r_1", rowCount: 2, schema: [] } };

    expect(parse(ExecutorRequests["exec.load"].result, failure).ok).toBe(true);
    expect(parse(ExecutorRequests["exec.load"].result, success).ok).toBe(true);
  });

  it("returns the figures a task showed as references, never as images", () => {
    const success = {
      ok: true,
      outputs: {},
      displays: [{ id: "d_1", mime: "image/png", width: 640, height: 480, title: "Ventas" }],
    };

    expect(parse(ExecutorRequests["exec.run"].result, success).ok).toBe(true);
    expect(
      parse(ExecutorRequests["exec.run"].result, {
        ...success,
        displays: [{ id: "d_1", mime: "image/png", width: 640, height: 480, bytes: "AAA" }],
      }).ok,
    ).toBe(false);
  });

  it("hands over the bytes of a figure it holds", () => {
    const content = { mime: "image/png", bytes: new Uint8Array([137, 80]) };

    expect(parse(ExecutorRequests["exec.display"].params, { displayId: "d_1" }).ok).toBe(true);
    expect(parse(ExecutorRequests["exec.display"].result, content).ok).toBe(true);
  });

  it("completes code at a line, from 1, and a column, from 0", () => {
    const params = { code: "import pandas as pd\npd.", line: 2, column: 3 };
    const items = { items: [{ label: "read_csv", kind: "function", detail: "def read_csv" }] };

    expect(parse(ExecutorRequests["exec.complete"].params, params).ok).toBe(true);
    expect(parse(ExecutorRequests["exec.complete"].params, { ...params, line: 0 }).ok).toBe(false);
    expect(parse(ExecutorRequests["exec.complete"].result, items).ok).toBe(true);
  });
});
