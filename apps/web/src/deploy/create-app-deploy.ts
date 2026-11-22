import { err } from "@nodomics/protocol";
import type { DeployService } from "./deploy-service.ts";
import { createHttpDeployService } from "./http-deploy-service.ts";

type DeployEnvironment = { readonly VITE_DEPLOY_URL?: string };
type DeploySession = { readonly getAccessToken: () => Promise<string | undefined> };

const notConfigured = () => Promise.resolve(err({ code: "NOT_CONFIGURED" as const }));

/** The hosting service when its URL is configured; otherwise one that says it is not. */
export function createAppDeploy(
  environment: DeployEnvironment,
  { getAccessToken }: DeploySession,
): DeployService {
  const baseUrl = environment.VITE_DEPLOY_URL;
  if (baseUrl === undefined || baseUrl === "")
    return {
      plan: notConfigured,
      apply: notConfigured,
      redeploy: notConfigured,
      list: notConfigured,
      remove: notConfigured,
    };
  return createHttpDeployService({
    baseUrl,
    getAccessToken,
    fetch: (input, init) => fetch(input, init),
  });
}
