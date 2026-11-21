import { expect, it } from "vitest";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";

const IDENTITY = { userId: "user-1", accessToken: "token-1" };

const CAPABILITIES = {
  "list nodes": "nodes.list",
  "read manifest": "nodes.get_manifest",
  "read flow": "flows.get",
  "search flows": "flows.search",
  "create draft": "flows.create_draft",
  "add node": "flows.add_node",
  "remove node": "flows.remove_node",
  connect: "flows.connect",
  disconnect: "flows.disconnect",
  "set param": "flows.set_param",
  batch: "flows.batch",
  "create code node": "flows.create_code_node",
  "update code node": "flows.update_code_node",
  "declare flow as node": "flows.declare_as_node",
  validate: "flows.validate",
  diff: "flows.diff",
  apply: "flows.apply",
  discard: "flows.discard",
  "run flow": "run.flow",
  "read sample": "run.sample",
  "read logs": "run.logs",
} as const;

it("fake mcp covers every capability in spec section 4", async () => {
  const result = await createFakeMcp().listTools();

  const names = result.ok ? result.value.map(({ name }) => name) : [];
  expect(names).toEqual(expect.arrayContaining(Object.values(CAPABILITIES)));
  expect(result.ok && result.value.every(({ inputSchema }) => inputSchema["type"] === "object")).toBe(
    true,
  );
});
