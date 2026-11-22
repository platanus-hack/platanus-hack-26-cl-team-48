import { err } from "@nodomics/protocol";
import type { UserIdentity } from "./identity.ts";
import { applyTools } from "./tools-apply.ts";
import { draftTools } from "./tools-drafts.ts";
import { readTools } from "./tools-read.ts";
import type { ToolDeps } from "./tool-context.ts";
import type { ToolDescriptor, ToolResult } from "./tool-definition.ts";
export type { ToolDescriptor, ToolResult } from "./tool-definition.ts";
export type Tools = {
  readonly list: () => readonly ToolDescriptor[];
  readonly call: (
    name: string,
    args: unknown,
    identity: UserIdentity,
  ) => Promise<ToolResult | "unknown-tool" | "invalid-args">;
};
export function createTools(deps: ToolDeps): Tools {
  const definitions = [...readTools(deps), ...draftTools(deps), ...applyTools(deps)];
  const registry = new Map(definitions.map((tool) => [tool.name, tool]));
  return {
    list: () =>
      definitions.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    call: async (name, args, identity) => {
      const tool = registry.get(name);
      if (tool === undefined) return "unknown-tool";
      try {
        return await tool.call(args, identity);
      } catch (error) {
        return err({ message: error instanceof Error ? error.message : "Tool failed" });
      }
    },
  };
}
