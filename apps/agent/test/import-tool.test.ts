import { describe, expect, it } from "vitest";
import { ok, type Result } from "@nodomics/protocol";
import type { McpPort } from "../src/mcp/mcp-port.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import { createFakeSandbox } from "../src/sandbox/fake-sandbox.ts";
import { createJobTokens } from "../src/sandbox/job-tokens.ts";
import type { ImportReport, SandboxReport } from "../src/import/import-report.ts";
import {
  createImportTool,
  IMPORT_TOOL_NAME,
  VERIFICATION_LABEL,
  withLocalTools,
} from "../src/import/import-tool.ts";
import { REQUEST_ALLOWLIST } from "../src/requests/allowlists.ts";
import { SYSTEM_PROMPT } from "../src/prompts/system.ts";
import { createFakeProposalStore } from "../src/proposals/fake-proposal-store.ts";
import type { StoredProposal } from "../src/proposals/proposal-store-port.ts";
import { loadConfig } from "../src/config.ts";
import { buildRequestDeps } from "../src/requests/wiring.ts";
import { createHandleRequest } from "../src/requests/handle-request.ts";
import type { LlmPort } from "../src/llm/llm-port.ts";
import type { IdentityPort } from "../src/requests/identity.ts";

const SAMPLE_IDENTITY = { userId: "user-1", accessToken: "token-abc" };

const VALID_REPORT: SandboxReport = {
  status: "verified",
  provenance: {
    repo: "owner/repo",
    commit: "a".repeat(40),
    paths: ["src/index.ts"],
    license: "MIT",
  },
  draftId: "draft-123",
  mapping: [],
  cases: [
    {
      name: "distingue null de cero",
      input: [{ val: 0 }],
      expected: [{ is_null: false }],
      observed: [{ is_null: false }],
      expectedBy: { kind: "user" },
    },
  ],
  outOfScope: [],
  missing: [],
  explanation: "Reproducido en SQL",
};

const SAMPLE_REPORT: ImportReport = {
  status: "verified",
  provenance: {
    repo: "owner/repo",
    commit: "b".repeat(40),
    paths: ["src/index.ts"],
    license: "MIT",
  },
  draftId: "draft-import-456",
  mapping: [],
  cases: [
    {
      name: "test-case",
      input: [{ x: 1 }],
      expected: [{ y: 2 }],
      observed: [{ y: 2 }],
      expectedBy: { kind: "user" },
    },
  ],
  checkedCases: [{ name: "test-case", passed: true, observed: [{ y: 2 }] }],
  outOfScope: [],
  missing: [],
  explanation: "Importado con éxito",
  verificationLabel: VERIFICATION_LABEL,
};

describe("import-tool (D6)", () => {
  it("listTools mezcla import.from_github con las del MCP", async () => {
    const mcp = createFakeMcp();
    const sandbox = createFakeSandbox(VALID_REPORT);
    const jobTokens = createJobTokens();
    const importTool = createImportTool({
      sandbox,
      jobTokens,
      sandboxApiKey: "test-key",
      agentUrl: "http://localhost:8787",
    });

    const wrapped = withLocalTools(mcp, [importTool]);
    const tools = await wrapped.listTools();

    expect(tools.ok).toBe(true);
    if (!tools.ok) return;
    const names = tools.value.map((t) => t.name);
    expect(names).toContain(IMPORT_TOOL_NAME);
    expect(names).toContain("flows.create_draft");
  });

  it("la llamada local no llega al MCP", async () => {
    let mcpCallCount = 0;
    const baseMcp: McpPort = {
      listTools: () => Promise.resolve(ok([])),
      call: () => {
        mcpCallCount++;
        return Promise.resolve(ok({ fromMcp: true }));
      },
    };

    const sandbox = createFakeSandbox(VALID_REPORT);
    const jobTokens = createJobTokens();
    const importTool = createImportTool({
      sandbox,
      jobTokens,
      sandboxApiKey: "test-key",
      agentUrl: "http://localhost:8787",
    });

    const wrapped = withLocalTools(baseMcp, [importTool]);
    const res = await wrapped.call(
      IMPORT_TOOL_NAME,
      { need: "distinguir ceros de nulos" },
      SAMPLE_IDENTITY,
    );

    expect(mcpCallCount).toBe(0);
    expect(res.ok).toBe(true);
  });

  it("el estado lo decide decideStatus, no el reporte", async () => {
    const lyingReport: SandboxReport = {
      ...VALID_REPORT,
      status: "verified",
      cases: [
        {
          name: "caso discrepante",
          input: [{ val: 0 }],
          expected: [{ is_null: false }],
          observed: [{ is_null: true }],
          expectedBy: { kind: "user" },
        },
      ],
    };

    const sandbox = createFakeSandbox(lyingReport);
    const jobTokens = createJobTokens();
    const importTool = createImportTool({
      sandbox,
      jobTokens,
      sandboxApiKey: "test-key",
      agentUrl: "http://localhost:8787",
    });

    const wrapped = withLocalTools(createFakeMcp(), [importTool]);
    const res = await wrapped.call(
      IMPORT_TOOL_NAME,
      { need: "distinguir ceros de nulos" },
      SAMPLE_IDENTITY,
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const report = res.value as SandboxReport & { label?: string };
    expect(report.status).toBe("unverified");
    expect(report.label).toBe(VERIFICATION_LABEL);
  });

  it("sandbox caído → SANDBOX_UNAVAILABLE con mensaje que no dice incompatible", async () => {
    const sandbox = createFakeSandbox(undefined, "SANDBOX_UNAVAILABLE");
    const jobTokens = createJobTokens();
    const importTool = createImportTool({
      sandbox,
      jobTokens,
      sandboxApiKey: "test-key",
      agentUrl: "http://localhost:8787",
    });

    const wrapped = withLocalTools(createFakeMcp(), [importTool]);
    const res = await wrapped.call(
      IMPORT_TOOL_NAME,
      { need: "distinguir ceros de nulos" },
      SAMPLE_IDENTITY,
    );

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.message).toContain("SANDBOX_UNAVAILABLE");
    expect(res.error.message.toLowerCase()).not.toContain("incompatible");
  });
});

describe("requests-import (D7, D8, D9)", () => {
  it("allowlist incluye import.from_github y sigue sin flows.apply", () => {
    expect(REQUEST_ALLOWLIST).toContain("import.from_github");
    expect(REQUEST_ALLOWLIST).not.toContain("flows.apply");
    expect(REQUEST_ALLOWLIST).not.toContain("flows.publish");
    expect(SYSTEM_PROMPT).toContain("import.from_github");
    expect(SYSTEM_PROMPT).toContain("verificado");
  });

  it("el store falso guarda y devuelve importReport", async () => {
    const store = createFakeProposalStore();
    const stored: StoredProposal = {
      proposal: {
        id: "prop-1",
        flowId: "flow-1",
        draftId: "draft-1",
        baseRevision: "rev-1",
        version: 1,
        status: "pending",
        changes: [],
      },
      cards: [],
      ownerId: "user-1",
      importReport: SAMPLE_REPORT,
    };

    const saveRes = await store.save(stored);
    expect(saveRes.ok).toBe(true);

    const getRes = await store.get("prop-1", "user-1");
    expect(getRes.ok).toBe(true);
    if (!getRes.ok) return;
    expect(getRes.value.importReport).toEqual(SAMPLE_REPORT);
  });

  it("la respuesta incluye importReport", async () => {
    const mockIdentity: IdentityPort = {
      resolve: (token) =>
        Promise.resolve(
          token === "valid-token"
            ? ok({ userId: "user-1", accessToken: "valid-token" })
            : { ok: false, error: { code: "UNAUTHORIZED", message: "unauthorized" } },
        ),
    };

    let step = 0;
    const mockLlm: LlmPort = {
      complete: (): Promise<
        Result<
          | { kind: "text"; text: string }
          | { kind: "tool_calls"; calls: readonly { id: string; name: string; args: unknown }[] },
          { code: "API_ERROR"; message: string }
        >
      > => {
        step++;
        if (step === 1) {
          return Promise.resolve(
            ok({
              kind: "tool_calls",
              calls: [
                {
                  id: "call-1",
                  name: IMPORT_TOOL_NAME,
                  args: { need: "distinguir ceros de nulos", repo: "owner/repo" },
                },
              ],
            }),
          );
        }
        return Promise.resolve(
          ok({
            kind: "text",
            text: "He importado la funcionalidad de owner/repo en el commit exacto. Comprobado por el agente en el sandbox: verified.",
          }),
        );
      },
    };

    const mockMcp: McpPort = {
      listTools: () =>
        Promise.resolve(
          ok([
            {
              name: IMPORT_TOOL_NAME,
              description: "import tool",
              inputSchema: { type: "object" },
            },
          ]),
        ),
      call: (name) => {
        if (name === IMPORT_TOOL_NAME) {
          return Promise.resolve(ok(SAMPLE_REPORT));
        }
        if (name === "flows.diff") {
          return Promise.resolve(ok([]));
        }
        if (name === "flows.get") {
          return Promise.resolve(ok({ id: "draft-import-456", revision: "rev-1" }));
        }
        return Promise.resolve(ok({}));
      },
    };

    const fakeStore = createFakeProposalStore();
    const handleRequest = createHandleRequest({
      identity: mockIdentity,
      llm: mockLlm,
      mcp: mockMcp,
      proposals: fakeStore,
    });

    const reply = await handleRequest({
      authorization: "Bearer valid-token",
      rawBody: JSON.stringify({ goal: "Importa pandas isna desde GitHub" }),
    });

    expect(reply.status).toBe(200);
    const body = reply.body as {
      draftId?: string;
      importReport?: ImportReport;
      proposalId?: string;
    };
    expect(body.importReport).toBeDefined();
    expect(body.importReport).toEqual(SAMPLE_REPORT);
    expect(body.draftId).toBe(SAMPLE_REPORT.draftId);
    if (body.proposalId) {
      const saved = await fakeStore.get(body.proposalId, "user-1");
      expect(saved.ok).toBe(true);
      if (saved.ok) {
        expect(saved.value.importReport).toEqual(SAMPLE_REPORT);
      }
    }
  });

  it("sin las variables, listTools no incluye import.from_github", async () => {
    const baseEnv = {
      ANTHROPIC_API_KEY: "sk-ant-test",
      VOYAGE_API_KEY: "fake",
      SUPABASE_URL: "https://supabase.example.com",
      SUPABASE_ANON_KEY: "anon-key",
      MCP_URL: "fake",
    };

    const configWithout = loadConfig(baseEnv);
    expect(configWithout.ok).toBe(true);
    if (!configWithout.ok) return;

    const depsWithout = buildRequestDeps(configWithout.value);
    const toolsWithout = await depsWithout.mcp.listTools();
    expect(toolsWithout.ok).toBe(true);
    if (toolsWithout.ok) {
      const names = toolsWithout.value.map((t) => t.name);
      expect(names).not.toContain(IMPORT_TOOL_NAME);
    }

    const configWith = loadConfig({
      ...baseEnv,
      RENDER_SANDBOX_API_KEY: "rnd_test",
      RENDER_WORKSPACE_ID: "wrk_test",
      SANDBOX_ANTHROPIC_API_KEY: "sk-ant-sandbox",
    });
    expect(configWith.ok).toBe(true);
    if (!configWith.ok) return;

    const depsWith = buildRequestDeps(configWith.value);
    const toolsWith = await depsWith.mcp.listTools();
    expect(toolsWith.ok).toBe(true);
    if (toolsWith.ok) {
      const names = toolsWith.value.map((t) => t.name);
      expect(names).toContain(IMPORT_TOOL_NAME);
    }
  });
});
