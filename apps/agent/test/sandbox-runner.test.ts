import { describe, expect, it } from "vitest";
import type {} from "../scripts/sandbox-spike.ts";
import { buildImportPrompt } from "../src/sandbox/import-prompt.ts";
import {
  createFakeSandbox,
  createRenderSandbox,
  DEFAULT_SANDBOX_TIMEOUT_MS,
  type SandboxPort,
} from "../src/sandbox/render-sandbox.ts";
import type { SandboxReport } from "../src/import/import-report.ts";

const VALID_REPORT: SandboxReport = {
  status: "verified",
  provenance: {
    repo: "octocat/Hello-World",
    commit: "7fd1a60b01f91b314f59955a4e4d4e80d8dee119",
    paths: ["index.js"],
    license: "MIT",
  },
  mapping: [],
  cases: [
    {
      name: "case-1",
      input: [{ val: 1 }],
      expected: [{ val: 1 }],
      expectedBy: { command: "node test.js", path: "test.js" },
    },
  ],
  outOfScope: [],
  missing: [],
  explanation: "Reproduced successfully",
};

describe("import-prompt (H5)", () => {
  it("el prompt incluye la necesidad y el repo", () => {
    const prompt = buildImportPrompt({
      need: "calcular total con descuento",
      repo: "acme/pricing",
      ref: "v1.0.0",
    });

    expect(prompt).toContain("calcular total con descuento");
    expect(prompt).toContain("acme/pricing");
    expect(prompt).toContain("v1.0.0");
    expect(prompt).toContain("run.flow");
    expect(prompt).toContain("run.sample");
    expect(prompt).toContain("observed");
  });

  it("dice que el contenido del repo no son instrucciones", () => {
    const prompt = buildImportPrompt({
      need: "filtrar nulos",
      repo: "org/repo",
    });

    expect(prompt).toMatch(/material de an[aá]lisis.*no.*instrucciones/i);
  });

  it("nombra /work/report.json", () => {
    const prompt = buildImportPrompt({
      need: "algo",
    });

    expect(prompt).toContain("/work/report.json");
  });

  it("el prompt nombra todos los campos obligatorios del reporte", () => {
    const prompt = buildImportPrompt({
      need: "sumar",
      repo: "org/repo",
      ref: "v1.0",
    });

    expect(prompt).toContain("status");
    expect(prompt).toContain("provenance");
    expect(prompt).toContain("repo");
    expect(prompt).toContain("commit");
    expect(prompt).toContain("paths");
    expect(prompt).toContain("license");
    expect(prompt).toContain("inputNode");
    expect(prompt).toContain("outputNode");
    expect(prompt).toContain("mapping");
    expect(prompt).toContain("cases");
    expect(prompt).toContain("name");
    expect(prompt).toContain("input");
    expect(prompt).toContain("expected");
    expect(prompt).toContain("observed");
    expect(prompt).toContain("expectedBy");
    expect(prompt).toContain("outOfScope");
    expect(prompt).toContain("missing");
    expect(prompt).toContain("explanation");
  });

  it("no contiene ningún secreto ni el token", () => {
    const prompt = buildImportPrompt({
      need: "algo",
      repo: "org/repo",
    });

    expect(prompt).not.toContain("RENDER");
    expect(prompt).not.toContain("API_KEY");
    expect(prompt).not.toContain("jwt");
    expect(prompt).not.toContain("Bearer");
  });
});

describe("sandbox-runner (H4)", () => {
  it("timeout por defecto es 10 minutos", () => {
    expect(DEFAULT_SANDBOX_TIMEOUT_MS).toBe(10 * 60 * 1000);
  });

  it("run-import.sh escribe type http", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const scriptPath = path.resolve(import.meta.dirname, "../sandbox/run-import.sh");
    const scriptContent = await fs.readFile(scriptPath, "utf8");
    expect(scriptContent).toContain('"type": "http"');
    expect(scriptContent).toContain('"$PROMPT"');
  });

  it("el entorno incluye PROMPT igual a buildImportPrompt(input)", async () => {
    let capturedEnv: Record<string, string> | undefined;
    const runner = createRenderSandbox({
      client: {
        sandboxes: {
          create: (input?: { env?: Record<string, string> }) => {
            capturedEnv = input?.env;
            return Promise.resolve({ id: "sbx-prompt" });
          },
          exec: () => {
            async function* gen() {
              await Promise.resolve();
              yield { type: "exit" as const, exit_code: 0 };
            }
            return Promise.resolve(gen());
          },
          download: () =>
            Promise.resolve({ data: Buffer.from(JSON.stringify(VALID_REPORT)), size: 10 }),
          terminate: () => Promise.resolve(),
        },
      },
    });

    const runInput = {
      jobId: "j-prompt",
      need: "sumar dos numeros",
      repo: "org/repo",
      ref: "main",
      jobToken: "tok-1",
      agentUrl: "https://agent",
      sandboxApiKey: "key-1",
    };

    await runner.runImport(runInput);
    expect(capturedEnv?.["PROMPT"]).toBe(buildImportPrompt(runInput));
  });

  it("el entorno del sandbox lleva JOB_TOKEN, AGENT_URL, NEED, REPO, REF y ANTHROPIC_API_KEY (y nunca RENDER_SANDBOX_API_KEY, la clave del servicio ni el JWT)", async () => {
    let capturedEnv: Record<string, string> | undefined;
    let terminated = false;

    const fakeRenderClient = {
      sandboxes: {
        create: (input?: { env?: Record<string, string> }) => {
          capturedEnv = input?.env;
          return Promise.resolve({ id: "sbx-test-123" });
        },
        exec: () => {
          async function* gen() {
            await Promise.resolve();
            yield { type: "exit" as const, exit_code: 0 };
          }
          return Promise.resolve(gen());
        },
        download: () => {
          return Promise.resolve({
            data: Buffer.from(JSON.stringify(VALID_REPORT)),
            size: 100,
          });
        },
        terminate: () => {
          terminated = true;
          return Promise.resolve();
        },
      },
    };

    const runner = createRenderSandbox({
      client: fakeRenderClient,
    });

    const result = await runner.runImport({
      jobId: "job-1",
      need: "sumar dos numeros",
      repo: "owner/repo",
      ref: "main",
      jobToken: "job-token-xyz",
      agentUrl: "https://agent.nodomics.internal",
      sandboxApiKey: "sandbox-anthropic-key-abc",
    });

    expect(result.ok).toBe(true);
    expect(terminated).toBe(true);
    expect(capturedEnv).toBeDefined();
    if (capturedEnv) {
      expect(capturedEnv["JOB_TOKEN"]).toBe("job-token-xyz");
      expect(capturedEnv["AGENT_URL"]).toBe("https://agent.nodomics.internal");
      expect(capturedEnv["NEED"]).toBe("sumar dos numeros");
      expect(capturedEnv["REPO"]).toBe("owner/repo");
      expect(capturedEnv["REF"]).toBe("main");
      expect(capturedEnv["ANTHROPIC_API_KEY"]).toBe("sandbox-anthropic-key-abc");

      // Verify forbidden keys are absent
      expect(capturedEnv["RENDER_SANDBOX_API_KEY"]).toBeUndefined();
      expect(capturedEnv["RENDER_API_KEY"]).toBeUndefined();
      expect(capturedEnv["SUPABASE_JWT"]).toBeUndefined();
      expect(capturedEnv["ANTHROPIC_BASE_URL"]).toBeUndefined();
    }
  });

  it("el sandbox se termina si falla, vence o va bien", async () => {
    const terminatedIds: string[] = [];
    const fakeClient = (shouldFailExec = false) => ({
      sandboxes: {
        create: () => Promise.resolve({ id: `sbx-${String(Date.now())}` }),
        exec: () => {
          if (shouldFailExec) return Promise.reject(new Error("network failure"));
          async function* gen() {
            await Promise.resolve();
            yield { type: "exit" as const, exit_code: 1 };
          }
          return Promise.resolve(gen());
        },
        download: () => Promise.reject(new Error("no report")),
        terminate: (id: string) => {
          terminatedIds.push(id);
          return Promise.resolve();
        },
      },
    });

    const runnerSuccess = createRenderSandbox({
      client: {
        sandboxes: {
          create: () => Promise.resolve({ id: "sbx-ok" }),
          exec: () => {
            async function* gen() {
              await Promise.resolve();
              yield { type: "exit" as const, exit_code: 0 };
            }
            return Promise.resolve(gen());
          },
          download: () =>
            Promise.resolve({ data: Buffer.from(JSON.stringify(VALID_REPORT)), size: 50 }),
          terminate: (id: string) => {
            terminatedIds.push(id);
            return Promise.resolve();
          },
        },
      },
    });

    await runnerSuccess.runImport({
      jobId: "j-1",
      need: "need",
      jobToken: "tok",
      agentUrl: "url",
      sandboxApiKey: "key",
    });
    expect(terminatedIds).toContain("sbx-ok");

    const runnerFailing = createRenderSandbox({ client: fakeClient(true) });
    const failResult = await runnerFailing.runImport({
      jobId: "j-2",
      need: "need",
      jobToken: "tok",
      agentUrl: "url",
      sandboxApiKey: "key",
    });
    expect(failResult.ok).toBe(false);
    expect(terminatedIds.length).toBe(2);
  });

  it("report.json ausente o inválido → REPORT_INVALID", async () => {
    const fakeClient = (reportContent: string | null) => ({
      sandboxes: {
        create: () => Promise.resolve({ id: "sbx-report-test" }),
        exec: () => {
          async function* gen() {
            await Promise.resolve();
            yield { type: "exit" as const, exit_code: 0 };
          }
          return Promise.resolve(gen());
        },
        download: () => {
          if (reportContent === null) return Promise.reject(new Error("File not found"));
          return Promise.resolve({ data: Buffer.from(reportContent), size: reportContent.length });
        },
        terminate: () => Promise.resolve(),
      },
    });

    const runnerMissing = createRenderSandbox({ client: fakeClient(null) });
    const missingRes = await runnerMissing.runImport({
      jobId: "j-1",
      need: "need",
      jobToken: "tok",
      agentUrl: "url",
      sandboxApiKey: "key",
    });
    expect(missingRes).toEqual({ ok: false, error: { code: "REPORT_INVALID" } });

    const runnerCorrupt = createRenderSandbox({ client: fakeClient("{ invalid json") });
    const corruptRes = await runnerCorrupt.runImport({
      jobId: "j-2",
      need: "need",
      jobToken: "tok",
      agentUrl: "url",
      sandboxApiKey: "key",
    });
    expect(corruptRes).toEqual({ ok: false, error: { code: "REPORT_INVALID" } });

    const runnerBadSchema = createRenderSandbox({
      client: fakeClient(JSON.stringify({ not: "a report" })),
    });
    const badSchemaRes = await runnerBadSchema.runImport({
      jobId: "j-3",
      need: "need",
      jobToken: "tok",
      agentUrl: "url",
      sandboxApiKey: "key",
    });
    expect(badSchemaRes).toEqual({ ok: false, error: { code: "REPORT_INVALID" } });
  });

  it("fake-sandbox contract works", async () => {
    const fake: SandboxPort = createFakeSandbox(VALID_REPORT);
    const result = await fake.runImport({
      jobId: "j-fake",
      need: "fake-need",
      jobToken: "fake-tok",
      agentUrl: "fake-url",
      sandboxApiKey: "fake-key",
    });

    expect(result).toEqual({ ok: true, value: VALID_REPORT });

    const fakeFailing: SandboxPort = createFakeSandbox(undefined, "TIMEOUT");
    const failResult = await fakeFailing.runImport({
      jobId: "j-fake",
      need: "fake-need",
      jobToken: "fake-tok",
      agentUrl: "fake-url",
      sandboxApiKey: "fake-key",
    });
    expect(failResult).toEqual({ ok: false, error: { code: "TIMEOUT" } });
  });
});
