import { describe, expect, it } from "vitest";
import {
  REPO_URL,
  deployFlow,
  flowOf,
  repoEdge,
  repoNode,
  serviceNode,
} from "../testing/deploy-flows.ts";
import { serviceSpecOf } from "./service-spec.ts";

const errorCodeOf = (result: ReturnType<typeof serviceSpecOf>): string | undefined =>
  result.ok ? undefined : result.error.code;

const specOf = (result: ReturnType<typeof serviceSpecOf>) => {
  if (!result.ok) throw new Error(`Expected a spec, got ${result.error.code}`);
  return result.value;
};

describe("serviceSpecOf — finding the node", () => {
  it("fails with NODE_NOT_FOUND when the node is not in the flow", () => {
    const result = serviceSpecOf(deployFlow(), "missing");

    expect(errorCodeOf(result)).toBe("NODE_NOT_FOUND");
  });

  it("fails with NOT_A_SERVICE when the node is a Repo node", () => {
    const result = serviceSpecOf(deployFlow(), "repo");

    expect(errorCodeOf(result)).toBe("NOT_A_SERVICE");
  });

  it("fails with NOT_A_SERVICE when the node is a data node", () => {
    const flow = flowOf(
      [
        {
          id: "csv",
          type: "core.source.csv",
          version: "0.1.0",
          params: {},
          position: { x: 0, y: 0 },
        },
      ],
      [],
    );

    const result = serviceSpecOf(flow, "csv");

    expect(errorCodeOf(result)).toBe("NOT_A_SERVICE");
  });

  it("fails with MISSING_REPO when nothing is connected to the repo input", () => {
    const flow = flowOf([repoNode(), serviceNode()], []);

    const result = serviceSpecOf(flow, "web");

    expect(errorCodeOf(result)).toBe("MISSING_REPO");
  });

  it("fails with MISSING_REPO when the repo input comes from a node that is not a Repo", () => {
    const flow = flowOf(
      [
        {
          id: "csv",
          type: "core.source.csv",
          version: "0.1.0",
          params: {},
          position: { x: 0, y: 0 },
        },
        serviceNode(),
      ],
      [{ id: "e1", from: { node: "csv", port: "table" }, to: { node: "web", port: "repo" } }],
    );

    const result = serviceSpecOf(flow, "web");

    expect(errorCodeOf(result)).toBe("MISSING_REPO");
  });

  it("uses the Repo node connected to this service, not another one in the flow", () => {
    const flow = flowOf(
      [
        repoNode({ url: "https://github.com/other/unrelated" }, "other-repo"),
        repoNode({ url: "https://github.com/nodomics/api" }, "api-repo"),
        serviceNode(),
      ],
      [repoEdge("api-repo", "web")],
    );

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.repo.url).toBe("https://github.com/nodomics/api");
  });
});

describe("serviceSpecOf — defaults", () => {
  it("builds a native Node spec with the default branch and no variables", () => {
    const flow = flowOf(
      [repoNode(), { ...serviceNode(), params: { startCommand: "npm start" } }],
      [repoEdge()],
    );

    const result = serviceSpecOf(flow, "web");

    expect(result).toEqual({
      ok: true,
      value: {
        repo: { url: REPO_URL, branch: "main" },
        build: { kind: "native", runtime: "node", startCommand: "npm start" },
        env: [],
      },
    });
  });

  it("fills the Docker defaults for the Dockerfile and the context", () => {
    const spec = specOf(serviceSpecOf(deployFlow({ service: { build: "docker" } }), "web"));

    expect(spec.build).toEqual({
      kind: "docker",
      dockerfilePath: "Dockerfile",
      dockerContext: ".",
    });
  });

  it("fills the static default publish path", () => {
    const spec = specOf(serviceSpecOf(deployFlow({ service: { build: "static" } }), "web"));

    expect(spec.build).toEqual({ kind: "static", publishPath: "dist" });
  });

  it("treats empty strings as absent and applies the defaults", () => {
    const flow = deployFlow({
      repo: { branch: "", rootDir: "" },
      service: { build: "docker", dockerfilePath: "", dockerContext: "", healthCheckPath: "" },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.repo).toEqual({ url: REPO_URL, branch: "main" });
    expect(spec.build).toEqual({
      kind: "docker",
      dockerfilePath: "Dockerfile",
      dockerContext: ".",
    });
    expect(spec).not.toHaveProperty("healthCheckPath");
  });
});

describe("serviceSpecOf — copying the chosen fields", () => {
  it("keeps the branch, the root folder and the health check path", () => {
    const flow = deployFlow({
      repo: { branch: "release", rootDir: "apps/api" },
      service: { healthCheckPath: "/health" },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.repo).toEqual({ url: REPO_URL, branch: "release", rootDir: "apps/api" });
    expect(spec.healthCheckPath).toBe("/health");
  });

  it("keeps the native runtime and both commands", () => {
    const flow = deployFlow({
      service: {
        build: "native",
        runtime: "python",
        buildCommand: "pip install -r requirements.txt",
        startCommand: "gunicorn app:app",
      },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.build).toEqual({
      kind: "native",
      runtime: "python",
      buildCommand: "pip install -r requirements.txt",
      startCommand: "gunicorn app:app",
    });
  });

  it("keeps the static build command and publish path", () => {
    const flow = deployFlow({
      service: { build: "static", buildCommand: "npm run build", publishPath: "out" },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.build).toEqual({
      kind: "static",
      buildCommand: "npm run build",
      publishPath: "out",
    });
  });

  it("drops the native and Docker fields from a static build", () => {
    const flow = deployFlow({
      service: {
        build: "static",
        runtime: "python",
        startCommand: "npm start",
        dockerfilePath: "Dockerfile.prod",
        dockerContext: "./api",
      },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.build).toEqual({ kind: "static", publishPath: "dist" });
  });

  it("drops the native and static fields from a Docker build", () => {
    const flow = deployFlow({
      service: {
        build: "docker",
        runtime: "go",
        buildCommand: "go build",
        startCommand: "./server",
        publishPath: "public",
      },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.build).toEqual({
      kind: "docker",
      dockerfilePath: "Dockerfile",
      dockerContext: ".",
    });
  });

  it("drops the Docker and static fields from a native build", () => {
    const flow = deployFlow({
      service: {
        build: "native",
        startCommand: "npm start",
        publishPath: "public",
        dockerfilePath: "Dockerfile.prod",
        dockerContext: "./api",
      },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.build).toEqual({ kind: "native", runtime: "node", startCommand: "npm start" });
  });

  it("ignores params outside the whitelist such as plan, region or name", () => {
    const flow = deployFlow({
      service: {
        plan: "pro",
        region: "frankfurt",
        name: "someone-elses-service",
        autoDeploy: "yes",
      },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(Object.keys(spec).sort()).toEqual(["build", "env", "repo"]);
    expect(JSON.stringify(spec)).not.toMatch(/"pro"|frankfurt|someone-elses-service|autoDeploy/);
  });

  it("copies literal and secret environment variables", () => {
    const env = [
      { name: "NODE_ENV", value: "production" },
      { name: "API_TOKEN", secret: "github-token" },
    ];

    const spec = specOf(serviceSpecOf(deployFlow({ service: { env } }), "web"));

    expect(spec.env).toEqual(env);
  });

  it("trims spaces around the repository URL and the commands", () => {
    const flow = deployFlow({
      repo: { url: `  ${REPO_URL}  ` },
      service: { startCommand: "  npm start  " },
    });

    const spec = specOf(serviceSpecOf(flow, "web"));

    expect(spec.repo.url).toBe(REPO_URL);
    expect(spec.build).toMatchObject({ startCommand: "npm start" });
  });
});

describe("serviceSpecOf — repository URL", () => {
  it.each([[`${REPO_URL}.git`], [`${REPO_URL}/`], ["https://github.com/nodomics/demo-app"]])(
    "normalizes %s without the .git suffix or trailing slash",
    (url) => {
      const spec = specOf(serviceSpecOf(deployFlow({ repo: { url } }), "web"));

      expect(spec.repo.url).toBe(REPO_URL);
    },
  );

  it("accepts owners and repositories with dots, dashes and underscores", () => {
    const url = "https://github.com/my_org.io/my-app_v2.0";

    const spec = specOf(serviceSpecOf(deployFlow({ repo: { url } }), "web"));

    expect(spec.repo.url).toBe(url);
  });

  it.each([
    ["http://github.com/nodomics/demo-app"],
    ["https://gitlab.com/nodomics/demo-app"],
    ["https://github.com.evil.com/nodomics/demo-app"],
    ["https://evil.com/github.com/nodomics/demo-app"],
    ["https://user:pass@github.com/nodomics/demo-app"],
    ["https://github.com/nodomics"],
    ["https://github.com/nodomics/demo-app/tree/main"],
    ["https://github.com/nodomics/demo-app?ref=main"],
    ["https://github.com/nodomics/demo app"],
    ["git@github.com:nodomics/demo-app.git"],
    ["file:///etc/passwd"],
    ["not a url"],
  ])("fails with INVALID_REPO for %s", (url) => {
    const result = serviceSpecOf(deployFlow({ repo: { url } }), "web");

    expect(errorCodeOf(result)).toBe("INVALID_REPO");
  });

  it.each([[""], ["   "], [undefined], [42]])("fails with INVALID_REPO for the url %j", (url) => {
    const flow = flowOf(
      [{ ...repoNode(), params: url === undefined ? {} : { url } }, serviceNode()],
      [repoEdge()],
    );

    const result = serviceSpecOf(flow, "web");

    expect(errorCodeOf(result)).toBe("INVALID_REPO");
  });
});

describe("serviceSpecOf — invalid specs", () => {
  it.each([[undefined], [""], ["   "]])(
    "fails with INVALID_SPEC for a native build with the start command %j",
    (startCommand) => {
      const flow = flowOf(
        [
          repoNode(),
          {
            ...serviceNode(),
            params: startCommand === undefined ? { build: "native" } : { startCommand },
          },
        ],
        [repoEdge()],
      );

      const result = serviceSpecOf(flow, "web");

      expect(errorCodeOf(result)).toBe("INVALID_SPEC");
    },
  );

  it.each([["1PORT"], ["MY-VAR"], ["MY VAR"], [""], ["$HOME"], ["Ñ"]])(
    "fails with INVALID_SPEC for the variable name %j",
    (name) => {
      const flow = deployFlow({ service: { env: [{ name, value: "x" }] } });

      const result = serviceSpecOf(flow, "web");

      expect(errorCodeOf(result)).toBe("INVALID_SPEC");
    },
  );

  it.each([["_PRIVATE"], ["port"], ["DATABASE_URL_2"]])("accepts the variable name %s", (name) => {
    const flow = deployFlow({ service: { env: [{ name, value: "x" }] } });

    const result = serviceSpecOf(flow, "web");

    expect(result.ok).toBe(true);
  });

  it("fails with INVALID_SPEC for a variable with both a value and a secret", () => {
    const flow = deployFlow({
      service: { env: [{ name: "API_TOKEN", value: "plain", secret: "github-token" }] },
    });

    const result = serviceSpecOf(flow, "web");

    expect(errorCodeOf(result)).toBe("INVALID_SPEC");
  });

  it("fails with INVALID_SPEC for repeated variable names", () => {
    const flow = deployFlow({
      service: {
        env: [
          { name: "NODE_ENV", value: "production" },
          { name: "NODE_ENV", value: "development" },
        ],
      },
    });

    const result = serviceSpecOf(flow, "web");

    expect(errorCodeOf(result)).toBe("INVALID_SPEC");
  });

  it("fails with INVALID_SPEC for a build kind outside docker, native and static", () => {
    const result = serviceSpecOf(deployFlow({ service: { build: "nixpacks" } }), "web");

    expect(errorCodeOf(result)).toBe("INVALID_SPEC");
  });

  it("fails with INVALID_SPEC for a runtime outside the supported list", () => {
    const result = serviceSpecOf(deployFlow({ service: { runtime: "java" } }), "web");

    expect(errorCodeOf(result)).toBe("INVALID_SPEC");
  });

  it("returns errors with a readable message", () => {
    const result = serviceSpecOf(deployFlow({ service: { startCommand: "" } }), "web");

    expect(result.ok ? "" : result.error.message).not.toBe("");
  });
});
