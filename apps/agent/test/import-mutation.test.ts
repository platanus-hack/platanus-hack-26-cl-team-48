import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decideStatus, type ReportWithObserved } from "../src/import/import-status.ts";

function loadFixture(filename: string): ReportWithObserved {
  const filePath = resolve(__dirname, "fixtures/import", filename);
  return JSON.parse(readFileSync(filePath, "utf-8")) as ReportWithObserved;
}

describe("import mutation test (D5)", () => {
  it("wrong translation is never verified", () => {
    const wrongReport = loadFixture("missing-vs-zero.wrong.report.json");

    const status = decideStatus({ report: wrongReport });

    expect(status).not.toBe("verified");
    expect(status).toBe("unverified");
  });

  it("correct reference translation is verified", () => {
    const correctReport = loadFixture("missing-vs-zero.report.json");

    const status = decideStatus({ report: correctReport });

    expect(status).toBe("verified");
  });
});
