import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { err, ok, type Result } from "@nodomics/protocol";

export const MAX_GOAL_LENGTH = 2000;

const RequestBody = Type.Object(
  {
    goal: Type.String({ minLength: 1, maxLength: MAX_GOAL_LENGTH }),
    flowId: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type AgentRequestBody = Static<typeof RequestBody>;

export function parseRequestBody(raw: string): Result<AgentRequestBody, "invalid_body"> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Value.Check(RequestBody, parsed) ? ok(parsed) : err("invalid_body");
  } catch {
    return err("invalid_body");
  }
}

export function toGoalMessage(body: AgentRequestBody): string {
  return body.flowId === undefined
    ? body.goal
    : `${body.goal}\n\nStart the draft from the existing flow "${body.flowId}".`;
}
