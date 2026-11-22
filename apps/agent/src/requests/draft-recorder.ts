import type { McpPort } from "../mcp/mcp-port.ts";
import type { ImportReport } from "../import/import-report.ts";

const CREATE_DRAFT = "flows.create_draft";
const IMPORT_TOOL = "import.from_github";

export type DraftRecorder = {
  readonly mcp: McpPort;
  readonly lastDraftId: () => string | undefined;
  readonly lastImportReport: () => ImportReport | undefined;
};

function readDraftId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("draftId" in value)) return undefined;
  return typeof value.draftId === "string" ? value.draftId : undefined;
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
  const seen: { draftId: string | undefined; report: ImportReport | undefined } = {
    draftId: undefined,
    report: undefined,
  };
  return {
    lastDraftId: () => seen.draftId,
    lastImportReport: () => seen.report,
    mcp: {
      listTools: () => mcp.listTools(),
      call: async (name, args, identity) => {
        const reply = await mcp.call(name, args, identity);
        if (reply.ok && name === CREATE_DRAFT) {
          seen.draftId = readDraftId(reply.value) ?? seen.draftId;
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
