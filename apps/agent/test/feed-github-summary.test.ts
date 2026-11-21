import { describe, expect, it } from "vitest";
import { createGithubSummary } from "../src/feed/github-summary.ts";

const USER_URL = "https://api.github.com/users/octocat";
const REPOS_URL = "https://api.github.com/users/octocat/repos?sort=updated&per_page=10";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const PROFILE = { login: "octocat", name: "The Octocat", bio: "Loves open source" };
const REPOS = [
  { name: "hello-world", description: "My first repo", language: "Ruby" },
  { name: "spoon-knife", description: "Forkable", language: "HTML" },
];

function fakeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const urls: string[] = [];
  const fetchImpl = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    urls.push(url);
    const handler = routes[url];
    return Promise.resolve(handler ? handler() : jsonResponse({}, 500));
  }) as typeof fetch;
  return { fetchImpl, urls };
}

describe("createGithubSummary", () => {
  it("requests the user and the ten most recently updated repos", async () => {
    const { fetchImpl, urls } = fakeFetch({
      [USER_URL]: () => jsonResponse(PROFILE),
      [REPOS_URL]: () => jsonResponse(REPOS),
    });

    await createGithubSummary(fetchImpl).summarize("octocat");

    expect(urls).toContain(USER_URL);
    expect(urls).toContain(REPOS_URL);
  });

  it("returns a text with the name, bio and each repo name, description and language", async () => {
    const { fetchImpl } = fakeFetch({
      [USER_URL]: () => jsonResponse(PROFILE),
      [REPOS_URL]: () => jsonResponse(REPOS),
    });

    const result = await createGithubSummary(fetchImpl).summarize("octocat");

    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const fragment of [
        "The Octocat",
        "Loves open source",
        "hello-world",
        "My first repo",
        "Ruby",
        "spoon-knife",
        "Forkable",
        "HTML",
      ]) {
        expect(result.value).toContain(fragment);
      }
    }
  });

  it("tolerates a user without name or bio and repos without description or language", async () => {
    const { fetchImpl } = fakeFetch({
      [USER_URL]: () => jsonResponse({ login: "octocat", name: null, bio: null }),
      [REPOS_URL]: () => jsonResponse([{ name: "bare", description: null, language: null }]),
    });

    const result = await createGithubSummary(fetchImpl).summarize("octocat");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toContain("bare");
  });

  it("returns NOT_FOUND when the user does not exist", async () => {
    const { fetchImpl } = fakeFetch({
      [USER_URL]: () => jsonResponse({ message: "Not Found" }, 404),
      [REPOS_URL]: () => jsonResponse({ message: "Not Found" }, 404),
    });

    const result = await createGithubSummary(fetchImpl).summarize("octocat");

    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("returns UPSTREAM for another non-OK status", async () => {
    const { fetchImpl } = fakeFetch({
      [USER_URL]: () => jsonResponse({}, 403),
      [REPOS_URL]: () => jsonResponse({}, 403),
    });

    const result = await createGithubSummary(fetchImpl).summarize("octocat");

    expect(result).toEqual({ ok: false, error: { code: "UPSTREAM" } });
  });

  it("returns UPSTREAM when the repos request fails", async () => {
    const { fetchImpl } = fakeFetch({
      [USER_URL]: () => jsonResponse(PROFILE),
      [REPOS_URL]: () => jsonResponse({}, 500),
    });

    const result = await createGithubSummary(fetchImpl).summarize("octocat");

    expect(result).toEqual({ ok: false, error: { code: "UPSTREAM" } });
  });

  it("returns UPSTREAM on a network error", async () => {
    const fetchImpl = (() => Promise.reject(new Error("offline"))) as typeof fetch;

    const result = await createGithubSummary(fetchImpl).summarize("octocat");

    expect(result).toEqual({ ok: false, error: { code: "UPSTREAM" } });
  });
});
