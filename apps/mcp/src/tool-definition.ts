import { parse, type Result } from "@nodomics/protocol";
import type { Static, TSchema } from "@sinclair/typebox";
import type { UserIdentity } from "./identity.ts";

export type ToolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
};
export type ToolResult = Result<unknown, { readonly message: string }>;
export type ToolDefinition = ToolDescriptor & {
  readonly call: (args: unknown, identity: UserIdentity) => Promise<ToolResult | "invalid-args">;
};
export function defineTool<S extends TSchema>({
  name,
  description,
  schema,
  execute,
}: {
  name: string;
  description: string;
  schema: S;
  execute: (args: Static<S>, identity: UserIdentity) => Promise<ToolResult>;
}): ToolDefinition {
  return {
    name,
    description,
    inputSchema: schema,
    call: async (args, identity) => {
      const parsed = parse(schema, args);
      return parsed.ok ? execute(parsed.value, identity) : "invalid-args";
    },
  };
}
