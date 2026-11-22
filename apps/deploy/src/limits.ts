import { err, ok, type Result } from "@nodomics/protocol";
import type { DeployError, PlanAction } from "./types.ts";

/** Nodomics pays for every service in its Render account (ADR 0027 §4). */
export const MAX_SERVICES_PER_USER = 2;
export const MAX_SERVICES_TOTAL = 20;

export function checkQuota(input: {
  readonly action: PlanAction;
  readonly userCount: number;
  readonly totalCount: number;
}): Result<void, DeployError> {
  if (input.action !== "create") return ok(undefined);
  if (input.userCount >= MAX_SERVICES_PER_USER)
    return err({
      code: "QUOTA_USER",
      message: `You can have at most ${String(MAX_SERVICES_PER_USER)} deployed services`,
    });
  if (input.totalCount >= MAX_SERVICES_TOTAL)
    return err({
      code: "QUOTA_TOTAL",
      message: "Nodomics has reached its limit of deployed services; try again later",
    });
  return ok(undefined);
}
