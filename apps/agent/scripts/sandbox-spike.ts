import { Render } from "@renderinc/sdk";

export type CommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

export type SpikeResult = {
  readonly createDurationMs: number;
  readonly installDurationMs: number;
  readonly networkChecks: Readonly<Record<string, string>>;
  readonly claudeVersion: string;
  readonly gitCloneExitCode: number;
  readonly mcpToolNaming: string;
};

const NETWORK_TARGETS = [
  "https://github.com",
  "https://registry.npmjs.org",
  "https://pypi.org",
  "https://nodomics-mcp.onrender.com/health",
] as const;

async function execInSandbox(
  render: Render,
  sandboxId: string,
  command: string,
): Promise<CommandResult> {
  const events = await render.sandboxes.exec(sandboxId, command);
  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  for await (const event of events) {
    if (event.type === "output") {
      if (event.stream === "stdout") stdout += event.data;
      else stderr += event.data;
    } else {
      exitCode = event.exit_code;
    }
  }
  return { exitCode, stdout, stderr };
}

async function checkUrl(render: Render, sandboxId: string, url: string): Promise<string> {
  const cmd = `curl -sS -o /dev/null -w '%{http_code}' "${url}"`;
  const result = await execInSandbox(render, sandboxId, cmd);
  return result.stdout.trim() || `err_${String(result.exitCode)}`;
}

async function testNetwork(render: Render, sandboxId: string): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  for (const target of NETWORK_TARGETS) {
    results[target] = await checkUrl(render, sandboxId, target);
  }
  return results;
}

async function checkMcpNaming(render: Render, sandboxId: string): Promise<string> {
  const script = [
    "node -e '",
    'const fs = require("fs");',
    'const path = require("path");',
    "try {",
    '  const dir = path.dirname(require.resolve("@anthropic-ai/claude-code"));',
    '  console.log("found claude in " + dir);',
    '} catch (e) { console.log("resolve failed: " + e.message); }',
    "'",
  ].join("");
  const res = await execInSandbox(render, sandboxId, script);
  return res.stdout.trim() || res.stderr.trim();
}

export async function runSpike(render: Render): Promise<SpikeResult> {
  const startCreate = Date.now();
  const sandbox = await render.sandboxes.create({ wait: true, timeoutSeconds: 600 });
  const createDurationMs = Date.now() - startCreate;

  try {
    const startInstall = Date.now();
    await execInSandbox(render, sandbox.id, "npm i -g @anthropic-ai/claude-code");
    const installDurationMs = Date.now() - startInstall;

    const networkChecks = await testNetwork(render, sandbox.id);
    const verRes = await execInSandbox(render, sandbox.id, "claude --version");
    const cloneCmd = "git clone --depth 1 https://github.com/octocat/Hello-World /tmp/spike-repo";
    const cloneRes = await execInSandbox(render, sandbox.id, cloneCmd);
    const mcpToolNaming = await checkMcpNaming(render, sandbox.id);

    return {
      createDurationMs,
      installDurationMs,
      networkChecks,
      claudeVersion: verRes.stdout.trim() || verRes.stderr.trim(),
      gitCloneExitCode: cloneRes.exitCode,
      mcpToolNaming,
    };
  } finally {
    await render.sandboxes.terminate(sandbox.id);
  }
}

async function getOwnerId(apiKey: string): Promise<string | undefined> {
  const envOwner = process.env["RENDER_WORKSPACE_ID"];
  if (envOwner) return envOwner;
  try {
    const tempRender = new Render({ token: apiKey });
    const api = tempRender as unknown as {
      apiClient: {
        GET: (p: string) => Promise<{ data?: readonly { owner?: { id?: string } }[] }>;
      };
    };
    const res = await api.apiClient.GET("/owners");
    return res.data?.[0]?.owner?.id;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const apiKey = process.env["RENDER_SANDBOX_API_KEY"];
  if (!apiKey) {
    process.stderr.write("RENDER_SANDBOX_API_KEY is not set.\n");
    process.exit(1);
  }

  const ownerId = await getOwnerId(apiKey);
  const render = new Render({
    token: apiKey,
    ...(ownerId ? { ownerId } : {}),
  });
  const result = await runSpike(render);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (process.argv[1]?.endsWith("sandbox-spike.ts")) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Spike failed: ${msg}\n`);
    process.exit(1);
  });
}
