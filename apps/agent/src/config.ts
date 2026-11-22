import { err, ok, type Result } from "@nodomics/protocol";

type Env = Readonly<Record<string, string | undefined>>;
type RequiredVariable =
  "ANTHROPIC_API_KEY" | "VOYAGE_API_KEY" | "SUPABASE_URL" | "SUPABASE_ANON_KEY" | "MCP_URL";
type UrlVariable = Extract<RequiredVariable, `${string}_URL`>;
type ConfigIssue = {
  readonly variable: RequiredVariable | "PORT" | "AGENT_MEMORY" | "AGENT_DEV_IDENTITY";
  readonly kind: "missing" | "invalid";
};

export type AgentConfig = {
  readonly anthropicApiKey: string;
  readonly voyageApiKey: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly mcpUrl: string;
  readonly port: number;
  readonly devIdentity: boolean;
  readonly memory: MemoryMode;
  readonly renderSandboxApiKey?: string | undefined;
  readonly renderWorkspaceId?: string | undefined;
  readonly sandboxAnthropicApiKey?: string | undefined;
  readonly agentUrl?: string | undefined;
};

export type MemoryMode = "fake" | "supabase";

export type ConfigError = { readonly issues: readonly ConfigIssue[] };

const DEFAULT_PORT = 8787;
const MAX_PORT = 65535;
const FAKE_MCP = "fake";

export function loadConfig(env: Env): Result<AgentConfig, ConfigError> {
  const anthropic = readRequired(env, "ANTHROPIC_API_KEY");
  const voyage = readRequired(env, "VOYAGE_API_KEY");
  const supabase = readHttpsUrl(env, "SUPABASE_URL");
  const anonKey = readRequired(env, "SUPABASE_ANON_KEY");
  const strict = isStrict(env);
  const mcp = readMcpUrl(env, strict);
  const port = readPort(env["PORT"]);
  const memory = readMemoryMode(env["AGENT_MEMORY"], strict);
  const devIdentity = readDevIdentity(env);
  const renderSandboxApiKey = env["RENDER_SANDBOX_API_KEY"]?.trim() || undefined;
  const renderWorkspaceId = env["RENDER_WORKSPACE_ID"]?.trim() || undefined;
  const sandboxAnthropicApiKey = env["SANDBOX_ANTHROPIC_API_KEY"]?.trim() || undefined;
  const agentUrl = env["AGENT_URL"]?.trim() || env["RENDER_EXTERNAL_URL"]?.trim() || undefined;

  if (
    anthropic.ok &&
    voyage.ok &&
    supabase.ok &&
    anonKey.ok &&
    mcp.ok &&
    port.ok &&
    memory.ok &&
    devIdentity.ok
  ) {
    return ok({
      anthropicApiKey: anthropic.value,
      voyageApiKey: voyage.value,
      supabaseUrl: supabase.value,
      supabaseAnonKey: anonKey.value,
      mcpUrl: mcp.value,
      port: port.value,
      devIdentity: devIdentity.value,
      memory: memory.value,
      ...(renderSandboxApiKey ? { renderSandboxApiKey } : {}),
      ...(renderWorkspaceId ? { renderWorkspaceId } : {}),
      ...(sandboxAnthropicApiKey ? { sandboxAnthropicApiKey } : {}),
      ...(agentUrl ? { agentUrl } : {}),
    });
  }
  return err({
    issues: collectIssues([anthropic, voyage, supabase, anonKey, mcp, port, memory, devIdentity]),
  });
}

function collectIssues(fields: readonly Result<unknown, ConfigIssue>[]): ConfigIssue[] {
  return fields.flatMap((field) => (field.ok ? [] : [field.error]));
}

function readRequired(env: Env, variable: RequiredVariable): Result<string, ConfigIssue> {
  const value = env[variable];
  return value === undefined || value.trim() === ""
    ? err({ variable, kind: "missing" })
    : ok(value);
}

function readHttpsUrl(env: Env, variable: UrlVariable): Result<string, ConfigIssue> {
  const field = readRequired(env, variable);
  if (field.ok && URL.parse(field.value)?.protocol !== "https:") {
    return err({ variable, kind: "invalid" });
  }
  return field;
}

const isProduction = (env: Env): boolean =>
  env["RENDER"] === "true" || env["NODE_ENV"] === "production";

// Fakes in production are only allowed in the explicit demo mode.
const isStrict = (env: Env): boolean => isProduction(env) && env["AGENT_ALLOW_FAKES"] !== "1";

function readDevIdentity(env: Env): Result<boolean, ConfigIssue> {
  const enabled = env["AGENT_DEV_IDENTITY"] === "1";
  return enabled && isProduction(env)
    ? err({ variable: "AGENT_DEV_IDENTITY", kind: "invalid" })
    : ok(enabled);
}

function readMcpUrl(env: Env, strict: boolean): Result<string, ConfigIssue> {
  if (env["MCP_URL"] !== FAKE_MCP) return readHttpsUrl(env, "MCP_URL");
  return strict ? err({ variable: "MCP_URL", kind: "invalid" }) : ok(FAKE_MCP);
}

function readMemoryMode(
  value: string | undefined,
  strict: boolean,
): Result<MemoryMode, ConfigIssue> {
  if (value === undefined) {
    return strict ? err({ variable: "AGENT_MEMORY", kind: "missing" }) : ok("fake");
  }
  if (strict && value === "fake") return err({ variable: "AGENT_MEMORY", kind: "invalid" });
  return value === "fake" || value === "supabase"
    ? ok(value)
    : err({ variable: "AGENT_MEMORY", kind: "invalid" });
}

function readPort(value: string | undefined): Result<number, ConfigIssue> {
  if (value === undefined) return ok(DEFAULT_PORT);

  const port = Number(value);
  return /^\d+$/.test(value) && port > 0 && port <= MAX_PORT
    ? ok(port)
    : err({ variable: "PORT", kind: "invalid" });
}
