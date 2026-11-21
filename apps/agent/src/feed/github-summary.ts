import { err, ok, parse, type Result } from "@nodomics/protocol";
import { Type, type Static } from "@sinclair/typebox";

export type GithubError = { readonly code: "NOT_FOUND" } | { readonly code: "UPSTREAM" };

export interface GithubSummaryPort {
  summarize(login: string): Promise<Result<string, GithubError>>;
}

const optionalText = () => Type.Optional(Type.Union([Type.String(), Type.Null()]));
const GithubUserSchema = Type.Object({
  login: Type.String(),
  name: optionalText(),
  bio: optionalText(),
});
const GithubReposSchema = Type.Array(
  Type.Object({ name: Type.String(), description: optionalText(), language: optionalText() }),
);
type GithubUser = Static<typeof GithubUserSchema>;
type GithubRepo = Static<typeof GithubReposSchema>[number];

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
    return summarizeReplies(await user.json(), await repos.json());
  } catch {
    return upstream();
  }
}

function summarizeReplies(user: unknown, repos: unknown): Result<string, GithubError> {
  const parsedUser = parse(GithubUserSchema, user);
  const parsedRepos = parse(GithubReposSchema, repos);
  return parsedUser.ok && parsedRepos.ok
    ? ok(describe(parsedUser.value, parsedRepos.value))
    : upstream();
}

const isPresent = (value: unknown): value is string => typeof value === "string" && value !== "";

function describe(user: GithubUser, repos: readonly GithubRepo[]): string {
  const profile = [user.name, user.bio].filter(isPresent);
  return [...profile, ...repos.map(describeRepo)].join("\n");
}

function describeRepo(repo: GithubRepo): string {
  const details = [repo.description, repo.language].filter(isPresent).join(" | ");
  return details === "" ? `- ${repo.name}` : `- ${repo.name}: ${details}`;
}
