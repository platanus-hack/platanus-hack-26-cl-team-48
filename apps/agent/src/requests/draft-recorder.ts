import type { McpPort } from "../mcp/mcp-port.ts";

const CREATE_DRAFT = "flows.create_draft";

export type DraftRecorder = {
  readonly mcp: McpPort;
  readonly lastDraftId: () => string | undefined;
};

function readDraftId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("draftId" in value)) return undefined;
  return typeof value.draftId === "string" ? value.draftId : undefined;
}

/** The loop only returns text, so the draft id is read off the create_draft results as they pass. */
export function recordDrafts(mcp: McpPort): DraftRecorder {
  const seen: { draftId: string | undefined } = { draftId: undefined };
  return {
    lastDraftId: () => seen.draftId,
    mcp: {
      listTools: () => mcp.listTools(),
      call: async (name, args, identity) => {
        const reply = await mcp.call(name, args, identity);
        if (reply.ok && name === CREATE_DRAFT) seen.draftId = readDraftId(reply.value) ?? seen.draftId;
        return reply;
      },
    },
  };
}
