import { describe, expect, it } from "vitest";
import { extractRecords } from "./records-path.ts";

describe("extractRecords", () => {
  it("keeps a top-level array when no path is given", () => {
    expect(extractRecords([{ a: 1 }], "")).toEqual({ ok: true, value: [{ a: 1 }] });
  });

  it("follows a dotted path into nested objects", () => {
    const body = { data: { items: [{ a: 1 }, { a: 2 }] } };

    expect(extractRecords(body, "data.items")).toEqual({ ok: true, value: [{ a: 1 }, { a: 2 }] });
  });

  it("fails when the path does not lead to an array", () => {
    expect(extractRecords({ data: { total: 3 } }, "data.total")).toEqual({
      ok: false,
      error: 'En "data.total" no hay una lista de registros',
    });
  });

  it("fails when the path does not exist", () => {
    expect(extractRecords({ data: {} }, "data.items").ok).toBe(false);
  });

  it("wraps a single top-level object as one record when no path is given", () => {
    expect(extractRecords({ a: 1 }, "")).toEqual({ ok: true, value: [{ a: 1 }] });
  });
});
