import { REQUEST_ALLOWLIST } from "../requests/allowlists.ts";
import type { ToolAllowlist } from "../loop/tool-allowlist.ts";

const FORBIDDEN_SANDBOX_TOOLS = new Set(["flows.apply", "flows.publish", "flows.declare_as_node"]);

export const PROXY_ALLOWLIST: ToolAllowlist = REQUEST_ALLOWLIST.filter(
  (toolName) => !FORBIDDEN_SANDBOX_TOOLS.has(toolName),
);
