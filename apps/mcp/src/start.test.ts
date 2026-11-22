import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { beforeAll, describe, expect, it } from "vitest";

const BUILD_TIMEOUT_MS = 300_000;
const START_TIMEOUT_MS = 30_000;
const serviceRoot = fileURLToPath(new URL("..", import.meta.url));

function startBundleWithoutConfiguration() {
  return spawnSync(process.execPath, ["dist/start.js"], {
    cwd: serviceRoot,
    env: { ...process.env, SUPABASE_URL: "", SUPABASE_ANON_KEY: "" },
    encoding: "utf8",
    timeout: START_TIMEOUT_MS,
  });
}

describe("MCP startup from the bundle", () => {
  let result: ReturnType<typeof startBundleWithoutConfiguration>;

  beforeAll(async () => {
    await build({
      root: serviceRoot,
      configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      logLevel: "silent",
    });
    result = startBundleWithoutConfiguration();
  }, BUILD_TIMEOUT_MS);

  it("starts the bundle without a spawn error", () => {
    expect(result.error).toBeUndefined();
  });

  it("exits with status 1 when the Supabase configuration is missing", () => {
    expect(result.status).toBe(1);
  });

  it("names the missing SUPABASE_URL and SUPABASE_ANON_KEY variables", () => {
    const output = result.stderr + result.stdout;

    expect(output).toContain("SUPABASE_URL");
    expect(output).toContain("SUPABASE_ANON_KEY");
  });

  it("runs under plain Node without unsupported module or resolution errors", () => {
    expect(result.stderr + result.stdout).not.toMatch(
      /ERR_UNSUPPORTED|UNKNOWN_FILE_EXTENSION|ERR_MODULE_NOT_FOUND/,
    );
  });
});
