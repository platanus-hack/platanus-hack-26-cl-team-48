import {
  DEPLOY_ERROR_CODES,
  DEPLOYMENT_STATUSES,
  type DeployErrorCode,
  type Deployment,
  type DeployPlan,
  type PlanChange,
} from "./deploy-service.ts";

const PLAN_ACTIONS: ReadonlyArray<DeployPlan["action"]> = ["create", "update", "unchanged"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isOneOf = <T extends string>(options: ReadonlyArray<T>, value: unknown): value is T =>
  options.some((option) => option === value);
const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

/** The `{ ok: true, ... }` body of a reply, or the code of its `{ ok: false, error }`. */
export function parseReplyBody(
  value: unknown,
): { readonly ok: true; readonly body: Record<string, unknown> } | DeployErrorCodeReply {
  if (isRecord(value) && value["ok"] === true) return { ok: true, body: value };
  return { ok: false, code: parseErrorCode(value) };
}

type DeployErrorCodeReply = { readonly ok: false; readonly code: DeployErrorCode };

function parseErrorCode(value: unknown): DeployErrorCode {
  const error = isRecord(value) ? value["error"] : undefined;
  const code = isRecord(error) ? error["code"] : undefined;
  return isOneOf(DEPLOY_ERROR_CODES, code) ? code : "UNAVAILABLE";
}

export function parsePlan(value: unknown): DeployPlan | undefined {
  if (!isRecord(value) || !Array.isArray(value["changes"])) return undefined;
  const { action, hash } = value;
  const changes = value["changes"].map(parseChange);
  if (!isOneOf(PLAN_ACTIONS, action) || !isString(hash) || !changes.every(isDefined))
    return undefined;
  return { action, hash, changes };
}

export function parseDeployments(value: unknown): readonly Deployment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const deployments = value.map(parseDeployment);
  return deployments.every(isDefined) ? deployments : undefined;
}

export function parseDeployment(value: unknown): Deployment | undefined {
  if (!isRecord(value)) return undefined;
  const { id, flowId, nodeId, url, status, updatedAt } = value;
  if (
    !isString(id) ||
    !isString(flowId) ||
    !isString(nodeId) ||
    !isString(updatedAt) ||
    !isOneOf(DEPLOYMENT_STATUSES, status) ||
    !(url === undefined || isString(url))
  )
    return undefined;
  return { id, flowId, nodeId, status, updatedAt, ...(isString(url) ? { url } : {}) };
}

function parseChange(value: unknown): PlanChange | undefined {
  if (!isRecord(value) || !isString(value["field"])) return undefined;
  const { field, before, after } = value;
  return {
    field,
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? {} : { after }),
  };
}
