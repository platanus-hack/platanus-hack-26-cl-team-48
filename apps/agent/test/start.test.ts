import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("fails startup with variable names and without invalid values", () => {
  const invalidUrl = "http://fixture.example/fixture-token";
  const startup = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../src/start.ts", import.meta.url))],
    {
      env: { MCP_URL: invalidUrl },
      encoding: "utf8",
      timeout: 5000,
    },
  );

  expect(startup.status).toBe(1);
  expect(startup.stderr).toContain("ANTHROPIC_API_KEY (missing)");
  expect(startup.stderr).toContain("MCP_URL (invalid)");
  expect(startup.stderr).not.toContain(invalidUrl);
});
