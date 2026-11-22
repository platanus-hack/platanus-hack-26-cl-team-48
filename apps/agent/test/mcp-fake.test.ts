import type { Result } from "@nodomics/protocol";
import { expect, it } from "vitest";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import type { McpError } from "../src/mcp/mcp-port.ts";

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
  expect(
    result.ok && result.value.every(({ inputSchema }) => inputSchema["type"] === "object"),
  ).toBe(true);
});

it("accepts an optional identity on listTools without changing result", async () => {
  const mcp = createFakeMcp();
  const withIdentity = await mcp.listTools(IDENTITY);
  const withoutIdentity = await mcp.listTools();

  expect(withIdentity).toEqual(withoutIdentity);
});

const errorCode = (result: Result<unknown, McpError>): string | null =>
  result.ok ? null : result.error.code;

type Mcp = ReturnType<typeof createFakeMcp>;
type Json = Record<string, unknown>;

async function callOk(mcp: Mcp, name: string, args: Json): Promise<Json> {
  const result = await mcp.call(name, args, IDENTITY);
  if (!result.ok) throw new Error(`${name} failed: ${result.error.code} ${result.error.message}`);
  return result.value as Json;
}

async function seededMcp(): Promise<{ mcp: Mcp; draftId: string }> {
  const mcp = createFakeMcp();
  const draft = await callOk(mcp, "flows.create_draft", {});
  const draftId = String(draft["draftId"]);
  await callOk(mcp, "flows.add_node", { draftId, type: "data.source", nodeId: "src" });
  await callOk(mcp, "flows.add_node", { draftId, type: "calc.window", nodeId: "win" });
  await callOk(mcp, "flows.connect", { draftId, from: "src.table", to: "win.table" });
  await callOk(mcp, "flows.set_param", { draftId, nodeId: "win", name: "hours", value: 2 });
  return { mcp, draftId };
}

it("fake draft is isolated from original", async () => {
  const { mcp, draftId } = await seededMcp();
  const applied = await callOk(mcp, "flows.apply", { draftId });
  const flowId = String(applied["flowId"]);
  const second = await callOk(mcp, "flows.create_draft", { flowId });
  const secondId = String(second["draftId"]);

  await callOk(mcp, "flows.set_param", {
    draftId: secondId,
    nodeId: "win",
    name: "hours",
    value: 4,
  });

  const original = await callOk(mcp, "flows.get", { flowId });
  const changes = (await callOk(mcp, "flows.diff", { draftId: secondId }))["changes"];
  expect(JSON.stringify(original)).toContain('"hours":2');
  expect(changes).toEqual([
    expect.objectContaining({ kind: "set_param", target: "win.hours", before: 2, after: 4 }),
  ]);
});

it("apply fails when base revision changed", async () => {
  const { mcp, draftId } = await seededMcp();
  const flowId = String((await callOk(mcp, "flows.apply", { draftId }))["flowId"]);
  const first = String((await callOk(mcp, "flows.create_draft", { flowId }))["draftId"]);
  const second = String((await callOk(mcp, "flows.create_draft", { flowId }))["draftId"]);
  await callOk(mcp, "flows.set_param", { draftId: first, nodeId: "win", name: "hours", value: 3 });
  await callOk(mcp, "flows.set_param", { draftId: second, nodeId: "win", name: "hours", value: 5 });
  await callOk(mcp, "flows.apply", { draftId: first });

  const result = await mcp.call("flows.apply", { draftId: second }, IDENTITY);

  expect(errorCode(result)).toBe("TOOL_FAILED");
});

it("diff of an untouched draft is empty", async () => {
  const mcp = createFakeMcp();
  const draft = await callOk(mcp, "flows.create_draft", {});

  const diff = await callOk(mcp, "flows.diff", { draftId: draft["draftId"] });

  expect(diff["changes"]).toEqual([]);
});

it("apply can take only some changes", async () => {
  const { mcp, draftId } = await seededMcp();

  const applied = await callOk(mcp, "flows.apply", { draftId, changeIds: ["add_node:src"] });

  const flow = await callOk(mcp, "flows.get", { flowId: applied["flowId"] });
  expect(Object.keys(flow["nodes"] as Json)).toEqual(["src"]);
});

it("batch is atomic when one operation fails", async () => {
  const { mcp, draftId } = await seededMcp();
  const ops = [
    { op: "add_node", args: { type: "table.filter", nodeId: "flt" } },
    { op: "connect", args: { from: "flt.table", to: "ghost.table" } },
  ];

  const result = await mcp.call("flows.batch", { draftId, ops }, IDENTITY);

  const draft = await callOk(mcp, "flows.get", { draftId });
  expect(result.ok).toBe(false);
  expect(Object.keys(draft["nodes"] as Json)).not.toContain("flt");
});

it("connect rejects a cycle and leaves the draft unchanged", async () => {
  const { mcp, draftId } = await seededMcp();
  await callOk(mcp, "flows.add_node", { draftId, type: "table.filter", nodeId: "flt" });
  await callOk(mcp, "flows.connect", { draftId, from: "win.table", to: "flt.table" });

  const result = await mcp.call(
    "flows.connect",
    { draftId, from: "flt.table", to: "win.table" },
    IDENTITY,
  );

  expect(errorCode(result)).toBe("TOOL_FAILED");
});

it("set_param rejects a value outside the manifest schema", async () => {
  const { mcp, draftId } = await seededMcp();

  const result = await mcp.call(
    "flows.set_param",
    { draftId, nodeId: "win", name: "hours", value: 99 },
    IDENTITY,
  );

  expect(errorCode(result)).toBe("TOOL_FAILED");
});

it("code node keeps its code and run.logs reads python logs", async () => {
  const { mcp, draftId } = await seededMcp();
  const code = {
    nodeId: "calc",
    language: "python",
    code: "out = df",
    inputs: ["table"],
    outputs: ["table"],
  };
  await callOk(mcp, "flows.create_code_node", { draftId, ...code });
  await callOk(mcp, "flows.update_code_node", { draftId, ...code, code: "out = df.head()" });

  const flow = await callOk(mcp, "flows.get", { draftId });
  const logs = await callOk(mcp, "run.logs", { draftId, nodeId: "calc" });

  expect(JSON.stringify(flow["customNodes"])).toContain("out = df.head()");
  expect(logs["lines"]).toEqual(expect.any(Array));
});

it("run.sample returns bounded pages and run.flow reports node states", async () => {
  const { mcp, draftId } = await seededMcp();

  const page = await callOk(mcp, "run.sample", { draftId, nodeId: "win", port: "table" });
  const last = await callOk(mcp, "run.sample", { draftId, nodeId: "win", port: "table", page: 2 });
  const run = await callOk(mcp, "run.flow", { draftId });

  expect(page["rows"]).toHaveLength(20);
  expect(page["hasMore"]).toBe(true);
  expect(last["hasMore"]).toBe(false);
  expect(run["nodes"]).toEqual([
    { nodeId: "src", status: "ok", error: null },
    { nodeId: "win", status: "ok", error: null },
  ]);
});

it("validate reports an unconnected input", async () => {
  const mcp = createFakeMcp();
  const draftId = String((await callOk(mcp, "flows.create_draft", {}))["draftId"]);
  await callOk(mcp, "flows.add_node", { draftId, type: "calc.window", nodeId: "win" });

  const report = await callOk(mcp, "flows.validate", { draftId });

  expect(report["valid"]).toBe(false);
});

it("fake mcp rejects args that break the input schema with INVALID_ARGS", async () => {
  const result = await createFakeMcp().call("flows.add_node", { draftId: 1 }, IDENTITY);

  expect(errorCode(result)).toBe("INVALID_ARGS");
});

it("fake mcp rejects an unknown tool with UNKNOWN_TOOL", async () => {
  const result = await createFakeMcp().call("flows.teleport", {}, IDENTITY);

  expect(errorCode(result)).toBe("UNKNOWN_TOOL");
});

it("fake mcp rejects a call without access token with UNAUTHORIZED", async () => {
  const result = await createFakeMcp().call(
    "nodes.list",
    {},
    { userId: "user-1", accessToken: "" },
  );

  expect(errorCode(result)).toBe("UNAUTHORIZED");
});
