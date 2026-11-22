import { Render } from "@renderinc/sdk";
import { err, ok, type Result } from "@nodomics/protocol";
import { Value } from "@sinclair/typebox/value";
import { SandboxReportSchema, type SandboxReport } from "../import/import-report.ts";
import { buildImportPrompt } from "./import-prompt.ts";
import type { SandboxError, SandboxPort, SandboxRunInput } from "./sandbox-port.ts";
import { createFakeSandbox } from "./fake-sandbox.ts";

export { createFakeSandbox };
export type { SandboxPort, SandboxError, SandboxRunInput };

export const DEFAULT_SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;

export type RenderSandboxesClient = {
  readonly create: (input?: {
    readonly env?: Record<string, string>;
    readonly timeoutSeconds?: number;
    readonly wait?: boolean;
  }) => Promise<{ readonly id: string }>;
  readonly exec: (
    sandboxId: string,
    command: string,
  ) => Promise<AsyncGenerator<{ readonly type: string }>>;
  readonly download: (
    sandboxId: string,
    path: string,
  ) => Promise<{ readonly data: Buffer; readonly size: number }>;
  readonly terminate: (sandboxId: string) => Promise<void>;
};

export type RenderClient = {
  readonly sandboxes: RenderSandboxesClient;
};

export type RenderSandboxOptions = {
  readonly renderApiKey?: string | undefined;
  readonly ownerId?: string | undefined;
  readonly client?: RenderClient | undefined;
  readonly timeoutMs?: number | undefined;
};

function buildEnv(input: SandboxRunInput): Record<string, string> {
  return {
    JOB_TOKEN: input.jobToken,
    AGENT_URL: input.agentUrl,
    NEED: input.need,
    PROMPT: buildImportPrompt(input),
    ANTHROPIC_API_KEY: input.sandboxApiKey,
    ...(input.repo ? { REPO: input.repo } : {}),
    ...(input.ref ? { REF: input.ref } : {}),
  };
}

function parseReport(rawBytes: Buffer): Result<SandboxReport, SandboxError> {
  try {
    const raw: unknown = JSON.parse(rawBytes.toString("utf8"));
    if (!Value.Check(SandboxReportSchema, raw)) {
      return err({ code: "REPORT_INVALID" });
    }
    return ok(raw);
  } catch {
    return err({ code: "REPORT_INVALID" });
  }
}

async function executeImport(
  client: RenderSandboxesClient,
  sandboxId: string,
): Promise<Result<SandboxReport, SandboxError>> {
  try {
    const events = await client.exec(sandboxId, "bash /apps/agent/sandbox/run-import.sh");
    while (!(await events.next()).done) {
      // drain
    }
    const file = await client.download(sandboxId, "/work/report.json");
    return parseReport(file.data);
  } catch {
    return err({ code: "REPORT_INVALID" });
  }
}

export function createRenderSandbox(options: RenderSandboxOptions = {}): SandboxPort {
  const ownerId = options.ownerId ?? process.env["RENDER_WORKSPACE_ID"];
  const client =
    options.client?.sandboxes ??
    new Render({
      token: options.renderApiKey ?? process.env["RENDER_SANDBOX_API_KEY"] ?? "",
      ...(ownerId ? { ownerId } : {}),
    }).sandboxes;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SANDBOX_TIMEOUT_MS;

  return {
    runImport: async (input: SandboxRunInput): Promise<Result<SandboxReport, SandboxError>> => {
      let sandboxId: string | null = null;
      try {
        const timeoutSeconds = Math.max(1, Math.floor(timeoutMs / 1000));
        const sbx = await client.create({ env: buildEnv(input), timeoutSeconds, wait: true });
        sandboxId = sbx.id;
        return await executeImport(client, sandboxId);
      } catch {
        return err({ code: "SANDBOX_UNAVAILABLE" });
      } finally {
        if (sandboxId) {
          await client.terminate(sandboxId).catch(() => undefined);
        }
      }
    },
  };
}
