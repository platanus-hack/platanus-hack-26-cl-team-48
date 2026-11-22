import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { SandboxReportSchema } from "../src/import/import-report.ts";

function loadFixture(filename: string): unknown {
  const filePath = resolve(__dirname, "fixtures/import", filename);
  return JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
}

describe("import reference fixtures (D1)", () => {
  it("all 3 fixtures pass parse(SandboxReportSchema)", () => {
    const validReport = loadFixture("missing-vs-zero.report.json");
    const wrongReport = loadFixture("missing-vs-zero.wrong.report.json");
    const incompatibleReport = loadFixture("incompatible.report.json");

    const validResult = parse(SandboxReportSchema, validReport);
    const wrongResult = parse(SandboxReportSchema, wrongReport);
    const incompatibleResult = parse(SandboxReportSchema, incompatibleReport);

    expect(validResult.ok).toBe(true);
    expect(wrongResult.ok).toBe(true);
    expect(incompatibleResult.ok).toBe(true);
  });
});
