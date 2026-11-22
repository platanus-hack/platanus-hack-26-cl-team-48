import { ok, type Result } from "@nodomics/protocol";
import type { DeployError, ServiceSpec } from "../types.ts";
import { failure, textParam, type NodeParams } from "./node-params.ts";

const DEFAULT_BRANCH = "main";
/** Only public GitHub repositories (ADR 0027 §4): no other host, credentials, paths or queries. */
const GITHUB_REPO_URL =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;
const DOTS_ONLY = /^\.+$/;

/** The repository a Service node deploys, from the params of its Repo node. */
export function repoSpecOf(params: NodeParams): Result<ServiceSpec["repo"], DeployError> {
  const url = githubUrlOf(textParam(params, "url") ?? "");
  if (url === undefined)
    return failure("INVALID_REPO", "The repository must be https://github.com/<owner>/<repo>");
  const rootDir = textParam(params, "rootDir");
  return ok({
    url,
    branch: textParam(params, "branch") ?? DEFAULT_BRANCH,
    ...(rootDir === undefined ? {} : { rootDir }),
  });
}

function githubUrlOf(text: string): string | undefined {
  const [, owner, repo] = GITHUB_REPO_URL.exec(text) ?? [];
  if (owner === undefined || repo === undefined) return undefined;
  if (DOTS_ONLY.test(owner) || DOTS_ONLY.test(repo)) return undefined;
  return `https://github.com/${owner}/${repo}`;
}
