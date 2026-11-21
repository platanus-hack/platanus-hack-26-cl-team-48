import { ok, type Result } from "@nodomics/protocol";
import { DEFAULT_CATALOG } from "./fake-catalog.ts";
import type { Catalog, FakeFlow } from "./fake-flow.ts";
import { DRAFT_TOOLS } from "./fake-tools-draft.ts";
import { READ_TOOLS } from "./fake-tools-read.ts";
import { fail, type FakeState, type FakeTool, type ToolOutcome } from "./fake-tool.ts";
import type { McpError, McpPort, ToolDescriptor, UserIdentity } from "./mcp-port.ts";

export type FakeMcpSeed = {
  readonly flows?: readonly FakeFlow[];
  readonly catalog?: Catalog;
};

const TOOLS: readonly FakeTool[] = [...READ_TOOLS, ...DRAFT_TOOLS];

function initialState(seed: FakeMcpSeed): FakeState {
  const flows = Object.fromEntries((seed.flows ?? []).map((flow) => [flow.id, flow]));
  return { catalog: seed.catalog ?? DEFAULT_CATALOG, flows, drafts: {}, counter: 0 };
}

export function createFakeMcp(seed: FakeMcpSeed = {}): McpPort {
  const holder = { state: initialState(seed) };
  const call = (name: string, args: unknown, identity: UserIdentity): Result<unknown, McpError> => {
    const outcome = dispatch(holder.state, { name, args, identity });
    if (!outcome.ok) return outcome;
    holder.state = outcome.value.state;
    return ok(outcome.value.value);
  };
  return {
    listTools: () => Promise.resolve(ok(TOOLS.map((tool): ToolDescriptor => tool.descriptor))),
    call: (name, args, identity) => Promise.resolve(call(name, args, identity)),
  };
}

function dispatch(
  state: FakeState,
  request: { readonly name: string; readonly args: unknown; readonly identity: UserIdentity },
): ToolOutcome {
  if (!request.identity.accessToken) return fail("UNAUTHORIZED", "Missing access token");
  const tool = TOOLS.find((candidate) => candidate.descriptor.name === request.name);
  return tool
    ? tool.run(state, request.args)
    : fail("UNKNOWN_TOOL", `Unknown tool "${request.name}"`);
}
