import { MESSAGES } from "../messages.ts";
import type { DeployErrorCode } from "./deploy-service.ts";

const errors = MESSAGES.deploy.errors;

const ERROR_MESSAGES: Readonly<Record<DeployErrorCode, string>> = {
  MISSING_REPO: errors.MISSING_REPO,
  INVALID_REPO: errors.INVALID_REPO,
  INVALID_SPEC: errors.INVALID_SPEC,
  QUOTA_USER: errors.QUOTA_USER,
  QUOTA_TOTAL: errors.QUOTA_TOTAL,
  PLAN_CHANGED: errors.PLAN_CHANGED,
  MISSING_SECRET: errors.MISSING_SECRET,
  UNAUTHORIZED: errors.UNAUTHORIZED,
  UNAVAILABLE: errors.UNAVAILABLE,
  SERVICE_KIND_CHANGED: errors.SERVICE_KIND_CHANGED,
  RATE_LIMITED: errors.RATE_LIMITED,
  NOT_CONFIGURED: MESSAGES.deploy.notAvailable,
  BAD_REQUEST: errors.generic,
  FLOW_NOT_FOUND: errors.generic,
  NODE_NOT_FOUND: errors.generic,
  NOT_A_SERVICE: errors.generic,
  DEPLOYMENT_NOT_FOUND: errors.generic,
  PROVIDER_ERROR: errors.generic,
};

export const deployErrorMessage = (code: DeployErrorCode): string => ERROR_MESSAGES[code];
