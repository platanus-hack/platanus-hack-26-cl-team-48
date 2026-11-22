import { Type, type Static } from "@sinclair/typebox";

const CellSchema = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
export const RowSchema = Type.Record(Type.String(), CellSchema);
export type Row = Static<typeof RowSchema>;

const COMMIT_SHA = "^[0-9a-f]{40}$";

export const ProvenanceSchema = Type.Object({
  repo: Type.String({ pattern: "^[\\w.-]+/[\\w.-]+$" }),
  commit: Type.String({ pattern: COMMIT_SHA }),
  paths: Type.Array(Type.String()),
  license: Type.Union([Type.String(), Type.Null()]),
});
export type Provenance = Static<typeof ProvenanceSchema>;

export const ImportStatusSchema = Type.Union([
  Type.Literal("verified"),
  Type.Literal("partial"),
  Type.Literal("unverified"),
  Type.Literal("incompatible"),
]);
export type ImportStatus = Static<typeof ImportStatusSchema>;

/** `expectedBy` names how the original code produced `expected`, so the translation never grades itself. */
export const VerificationCaseSchema = Type.Object({
  name: Type.String(),
  input: Type.Array(RowSchema),
  expected: Type.Array(RowSchema),
  observed: Type.Optional(Type.Array(RowSchema)),
  expectedBy: Type.Union([
    Type.Object({ command: Type.String(), path: Type.String() }),
    Type.Object({ kind: Type.Literal("user") }),
  ]),
});
export type VerificationCase = Static<typeof VerificationCaseSchema>;

/** What Claude Code writes to /work/report.json inside the sandbox. The service re-checks it. */
export const SandboxReportSchema = Type.Object({
  status: ImportStatusSchema,
  provenance: ProvenanceSchema,
  draftId: Type.Optional(Type.String()),
  inputNode: Type.Optional(Type.Object({ nodeId: Type.String(), port: Type.String() })),
  outputNode: Type.Optional(Type.Object({ nodeId: Type.String(), port: Type.String() })),
  mapping: Type.Array(
    Type.Object({
      sourcePath: Type.String(),
      nodeIds: Type.Array(Type.String()),
      decision: Type.Union([Type.Literal("direct"), Type.Literal("adapted")]),
    }),
  ),
  cases: Type.Array(VerificationCaseSchema),
  outOfScope: Type.Array(Type.String()),
  missing: Type.Array(Type.String()),
  explanation: Type.String(),
});
export type SandboxReport = Static<typeof SandboxReportSchema>;

export type CheckedCase = {
  readonly name: string;
  readonly passed: boolean;
  readonly observed: readonly Row[];
};

export type ImportReport = SandboxReport & { readonly checkedCases: readonly CheckedCase[] };
