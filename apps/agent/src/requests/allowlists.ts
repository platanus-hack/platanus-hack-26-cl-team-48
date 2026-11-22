import type { ToolAllowlist } from "../loop/tool-allowlist.ts";

/** Deliberately omits flows.apply and flows.publish: the agent only ever proposes drafts. */
export const REQUEST_ALLOWLIST: ToolAllowlist = [
  "nodes.list",
  "nodes.get_manifest",
  "flows.get",
  "flows.search",
  "flows.validate",
  "flows.create_draft",
  "flows.add_node",
  "flows.remove_node",
  "flows.set_param",
  "flows.connect",
  "flows.disconnect",
  "flows.create_code_node",
  "flows.update_code_node",
  "flows.declare_as_node",
  "flows.batch",
  "flows.diff",
  "flows.discard",
  "import.from_github",
  "run.flow",
  "run.sample",
  "run.logs",
];
