import { createHash } from "node:crypto";
import type { Plan, PlanChange, ServiceSpec } from "../types.ts";
import { canonicalJson } from "./canonical-json.ts";

const PLANNED_FIELDS = ["repo", "build", "env", "healthCheckPath"] as const;

export const hashSpec = (spec: ServiceSpec): string =>
  createHash("sha256").update(canonicalJson(spec)).digest("hex");

/** Compares the spec with the last deployed one to say whether to create, update or do nothing. */
export function planDeployment(
  spec: ServiceSpec,
  previous: { readonly spec: ServiceSpec; readonly specHash: string } | undefined,
): Plan {
  const hash = hashSpec(spec);
  if (previous === undefined)
    return { action: "create", hash, changes: changesBetween(undefined, spec), spec };
  if (previous.specHash === hash) return { action: "unchanged", hash, changes: [], spec };
  return { action: "update", hash, changes: changesBetween(previous.spec, spec), spec };
}

function changesBetween(before: ServiceSpec | undefined, after: ServiceSpec): PlanChange[] {
  return PLANNED_FIELDS.filter(
    (field) => canonicalJson(before?.[field]) !== canonicalJson(after[field]),
  ).map((field) => changeOf(field, before?.[field], after[field]));
}

const changeOf = (field: string, before: unknown, after: unknown): PlanChange => ({
  field,
  ...(before === undefined ? {} : { before }),
  ...(after === undefined ? {} : { after }),
});
