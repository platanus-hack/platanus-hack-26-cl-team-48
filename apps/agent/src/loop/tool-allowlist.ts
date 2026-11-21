import type { ToolDescriptor } from "../mcp/mcp-port.ts";

export type ToolAllowlist = readonly string[];

/** The closed tool list is enforced in code, not in the prompt: the model cannot talk its way past it. */
export function isToolAllowed(allowlist: ToolAllowlist, name: string): boolean {
  return allowlist.includes(name);
}

export function filterAllowedTools(
  allowlist: ToolAllowlist,
  tools: readonly ToolDescriptor[],
): readonly ToolDescriptor[] {
  return tools.filter((tool) => isToolAllowed(allowlist, tool.name));
}
