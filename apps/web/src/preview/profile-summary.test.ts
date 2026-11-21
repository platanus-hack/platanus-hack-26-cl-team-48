import type { ColumnProfile } from "@nodomics/protocol";
import { expect, it } from "vitest";
import { summarizeColumn } from "./profile-summary.ts";

const column = (profile: Partial<ColumnProfile>): ColumnProfile => ({
  name: "c",
  type: "text",
  count: 200,
  nulls: 0,
  distinct: 4,
  bins: [],
  ...profile,
});

it("summarizes numbers and dates by their range, in Spanish format", () => {
  expect(
    summarizeColumn(column({ name: "precio", type: "number", min: "5.37", max: "1200" })),
  ).toEqual({
    name: "precio",
    type: "número",
    summary: "5,37 a 1.200",
  });
  expect(
    summarizeColumn(column({ name: "fecha", type: "date", min: "2024-01-01", max: "2024-01-10" })),
  ).toEqual({ name: "fecha", type: "fecha", summary: "2024-01-01 a 2024-01-10" });
});

it("summarizes text by how many distinct values it has", () => {
  expect(summarizeColumn(column({ name: "region", type: "text", distinct: 4 }))).toEqual({
    name: "region",
    type: "texto",
    summary: "4 valores distintos",
  });
});

it("falls back to distinct values when a range is missing", () => {
  expect(summarizeColumn(column({ type: "number", distinct: 1200 })).summary).toBe(
    "1.200 valores distintos",
  );
});
