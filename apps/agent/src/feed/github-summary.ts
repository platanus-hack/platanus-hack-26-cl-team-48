import { err, ok, type Result } from "@nodomics/protocol";

export type GithubError = { readonly code: "NOT_FOUND" } | { readonly code: "UPSTREAM" };

export interface GithubSummaryPort {
  summarize(login: string): Promise<Result<string, GithubError>>;
}

type GithubUser = { readonly name?: unknown; readonly bio?: unknown };
type GithubRepo = {
  readonly name?: unknown;
  readonly description?: unknown;
  readonly language?: unknown;
};

const API_URL = "https://api.github.com";
const REPOS_QUERY = "sort=updated&per_page=10";
const HTTP_NOT_FOUND = 404;
const HEADERS = { Accept: "application/vnd.github+json" };

const upstream = (): Result<never, GithubError> => err({ code: "UPSTREAM" });

export function createGithubSummary(fetchImpl: typeof fetch): GithubSummaryPort {
  return { summarize: (login) => summarizeUser(fetchImpl, login) };
}

async function summarizeUser(
  fetchImpl: typeof fetch,
  login: string,
): Promise<Result<string, GithubError>> {
  const base = `${API_URL}/users/${encodeURIComponent(login)}`;
  try {
    const [user, repos] = await Promise.all([
      fetchImpl(base, { headers: HEADERS }),
      fetchImpl(`${base}/repos?${REPOS_QUERY}`, { headers: HEADERS }),
    ]);
    if (user.status === HTTP_NOT_FOUND) return err({ code: "NOT_FOUND" });
    if (!user.ok || !repos.ok) return upstream();
    return ok(describe((await user.json()) as GithubUser, (await repos.json()) as GithubRepo[]));
  } catch {
    return upstream();
  }
}

const isPresent = (value: unknown): value is string => typeof value === "string" && value !== "";

function describe(user: GithubUser, repos: readonly GithubRepo[]): string {
  const profile = [user.name, user.bio].filter(isPresent);
  return [...profile, ...repos.map(describeRepo)].join("\n");
}

function describeRepo(repo: GithubRepo): string {
  const details = [repo.description, repo.language].filter(isPresent).join(" | ");
  return details === "" ? `- ${String(repo.name)}` : `- ${String(repo.name)}: ${details}`;
}
