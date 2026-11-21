import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { err, ok, type Result } from "@nodomics/protocol";
import type { ToolCall, ToolResult } from "../llm/llm-port.ts";
import type { McpPort, ToolDescriptor, UserIdentity } from "../mcp/mcp-port.ts";
import { TIMED_OUT, withDeadline } from "./deadline.ts";
import { isToolAllowed, type ToolAllowlist } from "./tool-allowlist.ts";

export type ToolContext = {
  readonly mcp: McpPort;
  readonly identity: UserIdentity;
  readonly tools: readonly ToolDescriptor[];
  readonly allowlist: ToolAllowlist;
  readonly deadlineAt: number;
};

export async function executeToolCalls(
  calls: readonly ToolCall[],
  context: ToolContext,
): Promise<readonly ToolResult[] | typeof TIMED_OUT> {
  const results: ToolResult[] = [];
  for (const call of calls) {
    const result = await executeToolCall(call, context);
    if (result === TIMED_OUT) return TIMED_OUT;
    results.push(result);
  }
  return results;
}

async function executeToolCall(
  call: ToolCall,
  context: ToolContext,
): Promise<ToolResult | typeof TIMED_OUT> {
  const tool = resolveCall(call, context);
  if (!tool.ok) return toResult(call, tool.error, true);

  const reply = await withDeadline(
    context.mcp.call(call.name, call.args, context.identity),
    context.deadlineAt,
  );
  if (reply === TIMED_OUT) return TIMED_OUT;
  return reply.ok
    ? toResult(call, stringifyValue(reply.value), false)
    : toResult(call, `${reply.error.code}: ${reply.error.message}`, true);
}

function resolveCall(call: ToolCall, context: ToolContext): Result<ToolDescriptor, string> {
  if (!isToolAllowed(context.allowlist, call.name)) {
    return err(`Tool "${call.name}" is not allowed.`);
  }
  const tool = context.tools.find((candidate) => candidate.name === call.name);
  if (tool === undefined) return err(`Tool "${call.name}" does not exist.`);

  const issues = describeArgsIssues(tool, call.args);
  return issues === undefined ? ok(tool) : err(`Invalid arguments for "${call.name}": ${issues}`);
}

const schemaValidator = new AjvJsonSchemaValidator();

function describeArgsIssues(tool: ToolDescriptor, args: unknown): string | undefined {
  try {
    const validate = schemaValidator.getValidator(tool.inputSchema);
    return validate(args).errorMessage;
  } catch {
    return "the tool input schema could not be evaluated";
  }
}

const toResult = (call: ToolCall, content: string, isError: boolean): ToolResult => ({
  toolCallId: call.id,
  content,
  isError,
});

const stringifyValue = (value: unknown): string =>
  value === undefined ? "null" : JSON.stringify(value);
