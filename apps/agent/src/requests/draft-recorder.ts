import type { McpPort } from "../mcp/mcp-port.ts";
import type { ImportReport } from "../import/import-report.ts";

const CREATE_DRAFT = "flows.create_draft";
const IMPORT_TOOL = "import.from_github";

export type DraftRecorder = {
  readonly mcp: McpPort;
  readonly lastDraftId: () => string | undefined;
  readonly lastFlowId: () => string | undefined;
  readonly lastImportReport: () => ImportReport | undefined;
};

function readText(value: unknown, field: "draftId" | "flowId"): string | undefined {
  if (typeof value !== "object" || value === null || !(field in value)) return undefined;
  const text: unknown = (value as Record<string, unknown>)[field];
  return typeof text === "string" ? text : undefined;
}

function readReport(value: unknown): ImportReport | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("cases" in value) ||
    !("provenance" in value)
  )
    return undefined;
  return value as ImportReport;
}

/** The loop only returns text, so draft ids and reports are read off tool results as they pass. */
export function recordDrafts(mcp: McpPort): DraftRecorder {
  const seen: {
    draftId: string | undefined;
    flowId: string | undefined;
    report: ImportReport | undefined;
  } = {
    draftId: undefined,
    flowId: undefined,
    report: undefined,
  };
  return {
    lastDraftId: () => seen.draftId,
    lastFlowId: () => seen.flowId,
    lastImportReport: () => seen.report,
    mcp: {
      listTools: () => mcp.listTools(),
      call: async (name, args, identity) => {
        const reply = await mcp.call(name, args, identity);
        if (reply.ok && name === CREATE_DRAFT) {
          seen.draftId = readText(reply.value, "draftId") ?? seen.draftId;
          seen.flowId = readText(reply.value, "flowId");
        } else if (reply.ok && name === IMPORT_TOOL) {
          const report = readReport(reply.value);
          if (report) {
            seen.report = report;
            if (report.draftId) seen.draftId = report.draftId;
          }
        }
        return reply;
      },
    },
  };
}
