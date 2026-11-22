import { expect, it } from "vitest";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import { withLocalTools } from "../src/import/import-tool.ts";
import { REQUEST_ALLOWLIST } from "../src/requests/allowlists.ts";

it("request allowlist excludes apply and publish", () => {
  expect(REQUEST_ALLOWLIST).not.toContain("flows.apply");
  expect(REQUEST_ALLOWLIST).not.toContain("flows.publish");
});

it("request allowlist only names tools the mcp offers", async () => {
  const mcp = withLocalTools(createFakeMcp(), [
    {
      descriptor: {
        name: "import.from_github",
        description: "local import",
        inputSchema: { type: "object" },
      },
      handle: () => Promise.resolve({ ok: false, error: { code: "UNKNOWN_TOOL", message: "" } }),
    },
  ]);
  const listed = await mcp.listTools();
  const offered = listed.ok ? listed.value.map((tool) => tool.name) : [];

  expect(offered).toEqual(expect.arrayContaining([...REQUEST_ALLOWLIST]));
});

it("request allowlist covers reading, drafting and running", () => {
  expect(REQUEST_ALLOWLIST).toEqual(
    expect.arrayContaining(["nodes.list", "flows.create_draft", "flows.batch", "run.flow"]),
  );
});
