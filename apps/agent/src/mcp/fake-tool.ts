import { err, ok, parse } from "@nodomics/protocol";
import type { Static, TSchema } from "@sinclair/typebox";
import type { Catalog, FakeFlow } from "./fake-flow.ts";
import type { McpError, McpErrorCode, ToolDescriptor } from "./mcp-port.ts";
import type { Result } from "@nodomics/protocol";

export type FakeDraft = {
  readonly id: string;
  readonly flowId: string;
  readonly base: FakeFlow;
  readonly baseRevision: string;
  readonly flow: FakeFlow;
};

export type FakeState = {
  readonly catalog: Catalog;
  readonly flows: Readonly<Record<string, FakeFlow>>;
  readonly drafts: Readonly<Record<string, FakeDraft>>;
  readonly counter: number;
};

export type ToolOutcome = Result<{ readonly state: FakeState; readonly value: unknown }, McpError>;

export type FakeTool = {
  readonly descriptor: ToolDescriptor;
  readonly run: (state: FakeState, args: unknown) => ToolOutcome;
};

export const fail = (code: McpErrorCode, message: string): ToolOutcome => err({ code, message });

export const toolFailed = (message: string): ToolOutcome => fail("TOOL_FAILED", message);

export const done = (state: FakeState, value: unknown): ToolOutcome => ok({ state, value });

export function defineTool<S extends TSchema>(spec: {
  readonly name: string;
  readonly description: string;
  readonly schema: S;
  readonly handler: (state: FakeState, args: Static<S>) => ToolOutcome;
}): FakeTool {
  const run = (state: FakeState, args: unknown): ToolOutcome => {
    const parsed = parse(spec.schema, args);
    if (parsed.ok) return spec.handler(state, parsed.value);
    const issues = parsed.error.map(({ path, message }) => `${path || "args"}: ${message}`);
    return fail("INVALID_ARGS", issues.join("; "));
  };
  const inputSchema: Readonly<Record<string, unknown>> = { ...spec.schema };
  return { descriptor: { name: spec.name, description: spec.description, inputSchema }, run };
}
