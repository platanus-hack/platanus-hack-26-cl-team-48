import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "@nodomics/protocol";
import type { McpError, McpPort, ToolDescriptor, UserIdentity } from "../mcp/mcp-port.ts";
import type { SandboxPort, SandboxRunInput } from "../sandbox/sandbox-port.ts";
import type { JobTokens } from "../sandbox/job-tokens.ts";
import { buildImportPrompt } from "../sandbox/import-prompt.ts";
import { compareRows } from "./compare-rows.ts";
import type { CheckedCase, ImportReport, SandboxReport } from "./import-report.ts";
import { decideStatus } from "./import-status.ts";

export const IMPORT_TOOL_NAME = "import.from_github";
export const VERIFICATION_LABEL = "comprobado por el agente en el sandbox";

export type LocalTool = {
  readonly descriptor: ToolDescriptor;
  readonly handle: (args: unknown, identity: UserIdentity) => Promise<Result<unknown, McpError>>;
};

export type ImportToolDeps = {
  readonly sandbox: SandboxPort;
  readonly jobTokens: JobTokens;
  readonly sandboxApiKey: string;
  readonly agentUrl?: string | undefined;
};

export type ImportArgs = {
  readonly need: string;
  readonly repo?: string | undefined;
  readonly ref?: string | undefined;
};

const IMPORT_DESCRIPTOR: ToolDescriptor = {
  name: IMPORT_TOOL_NAME,
  description:
    "Importa una funcionalidad desde un repositorio de GitHub reproduciéndola en Nodomics.",
  inputSchema: {
    type: "object",
    properties: {
      need: { type: "string", description: "Descripción de lo que se necesita importar" },
      repo: { type: "string", description: "Repositorio GitHub en formato owner/repo" },
      ref: { type: "string", description: "Rama, tag o commit SHA específico" },
    },
    required: ["need"],
  },
};

function parseArgs(args: unknown): ImportArgs | null {
  if (typeof args !== "object" || args === null) return null;
  const raw = args as Record<string, unknown>;
  const rawNeed = raw["need"];
  if (typeof rawNeed !== "string" || rawNeed.trim().length === 0) return null;
  const rawRepo = raw["repo"];
  const rawRef = raw["ref"];
  const repo = typeof rawRepo === "string" ? rawRepo : undefined;
  const ref = typeof rawRef === "string" ? rawRef : undefined;
  return { need: rawNeed, ...(repo ? { repo } : {}), ...(ref ? { ref } : {}) };
}

function computeCheckedCases(cases: SandboxReport["cases"]): readonly CheckedCase[] {
  return cases.map((c) => ({
    name: c.name,
    passed: Boolean(c.observed && compareRows(c.expected, c.observed).equal),
    observed: c.observed ?? [],
  }));
}

function buildFinalReport(report: SandboxReport): ImportReport {
  const status = decideStatus({ report });
  const checkedCases = computeCheckedCases(report.cases);
  return {
    ...report,
    status,
    checkedCases,
    label: VERIFICATION_LABEL,
    verificationLabel: VERIFICATION_LABEL,
  };
}

async function executeImport(
  deps: ImportToolDeps,
  args: ImportArgs,
  identity: UserIdentity,
): Promise<Result<unknown, McpError>> {
  const jobId = randomUUID();
  const token = deps.jobTokens.issue({
    jobId,
    userId: identity.userId,
    accessToken: identity.accessToken,
  });
  const revoke = () => {
    deps.jobTokens.revoke(jobId);
  };
  try {
    const input: SandboxRunInput & { readonly revoke?: (id: string) => void } = {
      jobId,
      need: args.need,
      jobToken: token.token,
      agentUrl: deps.agentUrl ?? "http://localhost:8787",
      sandboxApiKey: deps.sandboxApiKey,
      revoke,
      ...(args.repo !== undefined ? { repo: args.repo } : {}),
      ...(args.ref !== undefined ? { ref: args.ref } : {}),
    };
    buildImportPrompt(input);
    const run = await deps.sandbox.runImport(input);
    if (!run.ok) {
      const code = run.error.code;
      const message = `${code}: el sandbox no está disponible (${run.error.message ?? "error"})`;
      return err({ code: "UNAVAILABLE", message });
    }
    return ok(buildFinalReport(run.value));
  } finally {
    revoke();
  }
}

export function createImportTool(deps: ImportToolDeps): LocalTool {
  return {
    descriptor: IMPORT_DESCRIPTOR,
    handle: (args, identity) => {
      const parsed = parseArgs(args);
      if (!parsed) {
        return Promise.resolve(
          err({ code: "INVALID_ARGS", message: "Argumento 'need' obligatorio" }),
        );
      }
      return executeImport(deps, parsed, identity);
    },
  };
}

export function withLocalTools(mcp: McpPort, localTools: readonly LocalTool[]): McpPort {
  const localMap = new Map(localTools.map((t) => [t.descriptor.name, t]));
  return {
    listTools: async (identity) => {
      const base = await mcp.listTools(identity);
      if (!base.ok) return base;
      return ok([...base.value, ...localTools.map((t) => t.descriptor)]);
    },
    call: (name, args, identity) => {
      const tool = localMap.get(name);
      if (tool) return tool.handle(args, identity);
      return mcp.call(name, args, identity);
    },
  };
}
