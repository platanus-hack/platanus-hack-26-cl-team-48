import type { McpPort } from "../mcp/mcp-port.ts";

const CREATE_DRAFT = "flows.create_draft";

export type DraftRecorder = {
  readonly mcp: McpPort;
  readonly lastDraftId: () => string | undefined;
  readonly lastFlowId: () => string | undefined;
};

function readText(value: unknown, field: "draftId" | "flowId"): string | undefined {
  if (typeof value !== "object" || value === null || !(field in value)) return undefined;
  const text: unknown = (value as Record<string, unknown>)[field];
  return typeof text === "string" ? text : undefined;
}

/** The loop only returns text, so the draft id is read off the create_draft results as they pass. */
export function recordDrafts(mcp: McpPort): DraftRecorder {
  const seen: { draftId: string | undefined; flowId: string | undefined } = {
    draftId: undefined,
    flowId: undefined,
  };
  return {
    lastDraftId: () => seen.draftId,
    lastFlowId: () => seen.flowId,
    mcp: {
      listTools: () => mcp.listTools(),
      call: async (name, args, identity) => {
        const reply = await mcp.call(name, args, identity);
        if (reply.ok && name === CREATE_DRAFT) {
          seen.draftId = readText(reply.value, "draftId") ?? seen.draftId;
          seen.flowId = readText(reply.value, "flowId");
        }
        return reply;
      },
    },
  };
}
