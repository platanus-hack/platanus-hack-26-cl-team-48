import { describe, expect, it } from "vitest";
import { decideStatus, type ReportWithObserved } from "../src/import/import-status.ts";

function createBaseReport(overrides?: Partial<ReportWithObserved>): ReportWithObserved {
  return {
    status: "verified",
    provenance: {
      repo: "pandas-dev/pandas",
      commit: "f538741432edf55c6b9fb5d0d496d2dd1d7c2457",
      paths: ["pandas/core/dtypes/missing.py"],
      license: "BSD-3-Clause",
    },
    mapping: [
      {
        sourcePath: "pandas/core/dtypes/missing.py",
        nodeIds: ["core"],
        decision: "adapted",
      },
    ],
    cases: [
      {
        name: "test 1",
        input: [{ val: 1 }],
        expected: [{ out: 1 }],
        observed: [{ out: 1 }],
        expectedBy: { kind: "user" },
      },
    ],
    outOfScope: [],
    missing: [],
    explanation: "ok",
    ...overrides,
  };
}

describe("decideStatus (D3)", () => {
  it("verified report with failing case becomes unverified", () => {
    const report = createBaseReport({
      status: "verified",
      cases: [
        {
          name: "failing case",
          input: [{ val: 1 }],
          expected: [{ out: 1 }],
          observed: [{ out: 2 }],
          expectedBy: { kind: "user" },
        },
      ],
    });

    const status = decideStatus({ report });
    expect(status).toBe("unverified");
  });

  it("cases without valid expectedBy or empty cases list becomes unverified", () => {
    const emptyCasesReport = createBaseReport({ cases: [] });
    expect(decideStatus({ report: emptyCasesReport })).toBe("unverified");

    const invalidExpectedByReport = createBaseReport({
      cases: [
        {
          name: "invalid expectedBy",
          input: [{ val: 1 }],
          expected: [{ out: 1 }],
          observed: [{ out: 1 }],
          expectedBy: { command: "", path: "" },
        },
      ],
    });
    expect(decideStatus({ report: invalidExpectedByReport })).toBe("unverified");
  });

  it("hasPythonNode yields incompatible", () => {
    const report = createBaseReport();
    const status = decideStatus({ report, hasPythonNode: true });
    expect(status).toBe("incompatible");
  });

  it("all cases pass and outOfScope is not empty yields partial", () => {
    const report = createBaseReport({
      outOfScope: ["advanced_feature"],
    });

    const status = decideStatus({ report });
    expect(status).toBe("partial");
  });

  it("all cases pass and outOfScope is empty yields verified", () => {
    const report = createBaseReport({
      outOfScope: [],
    });

    const status = decideStatus({ report });
    expect(status).toBe("verified");
  });

  it("incompatible report status is preserved", () => {
    const report = createBaseReport({
      status: "incompatible",
      missing: ["external_api"],
    });

    const status = decideStatus({ report });
    expect(status).toBe("incompatible");
  });
});
