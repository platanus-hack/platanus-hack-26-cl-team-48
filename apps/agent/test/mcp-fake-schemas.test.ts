import { describe, expect, it } from "vitest";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";

const FORBIDDEN_TOP_LEVEL = ["anyOf", "oneOf", "allOf"] as const;

async function listFakeTools() {
  const listed = await createFakeMcp().listTools();
  if (!listed.ok) throw new Error(`listTools failed: ${listed.error.message}`);
  return listed.value;
}

describe("fake MCP tool schemas", () => {
  it("every fake MCP tool has a plain object input schema", async () => {
    const tools = await listFakeTools();

    const offenders = tools
      .filter((tool) => {
        const schema = tool.inputSchema;
        return schema["type"] !== "object" || FORBIDDEN_TOP_LEVEL.some((key) => key in schema);
      })
      .map((tool) => tool.name);

    expect(tools.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("edit tools still require draftId alongside their own fields", async () => {
    const tools = await listFakeTools();

    const schema = tools.find((tool) => tool.name === "flows.add_node")?.inputSchema;

    const properties = (schema?.["properties"] ?? {}) as Record<string, unknown>;
    const required = (schema?.["required"] ?? []) as readonly string[];
    for (const field of ["draftId", "type", "nodeId"]) {
      expect(properties).toHaveProperty(field);
      expect(required).toContain(field);
    }
  });
});
