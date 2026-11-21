import { err, ok, type Result } from "@nodomics/protocol";

type Env = Readonly<Record<string, string | undefined>>;
type RequiredVariable =
  "ANTHROPIC_API_KEY" | "VOYAGE_API_KEY" | "SUPABASE_URL" | "SUPABASE_ANON_KEY" | "MCP_URL";
type UrlVariable = Extract<RequiredVariable, `${string}_URL`>;
type ConfigIssue = {
  readonly variable: RequiredVariable | "PORT";
  readonly kind: "missing" | "invalid";
};

export type AgentConfig = {
  readonly anthropicApiKey: string;
  readonly voyageApiKey: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly mcpUrl: string;
  readonly port: number;
};

export type ConfigError = { readonly issues: readonly ConfigIssue[] };

const DEFAULT_PORT = 8787;
const MAX_PORT = 65535;

export function loadConfig(env: Env): Result<AgentConfig, ConfigError> {
  const anthropic = readRequired(env, "ANTHROPIC_API_KEY");
  const voyage = readRequired(env, "VOYAGE_API_KEY");
  const supabase = readHttpsUrl(env, "SUPABASE_URL");
  const anonKey = readRequired(env, "SUPABASE_ANON_KEY");
  const mcp = readHttpsUrl(env, "MCP_URL");
  const port = readPort(env["PORT"]);

  if (anthropic.ok && voyage.ok && supabase.ok && anonKey.ok && mcp.ok && port.ok) {
    return ok({
      anthropicApiKey: anthropic.value,
      voyageApiKey: voyage.value,
      supabaseUrl: supabase.value,
      supabaseAnonKey: anonKey.value,
      mcpUrl: mcp.value,
      port: port.value,
    });
  }
  return err({ issues: collectIssues([anthropic, voyage, supabase, anonKey, mcp, port]) });
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

function readPort(value: string | undefined): Result<number, ConfigIssue> {
  if (value === undefined) return ok(DEFAULT_PORT);

  const port = Number(value);
  return /^\d+$/.test(value) && port > 0 && port <= MAX_PORT
    ? ok(port)
    : err({ variable: "PORT", kind: "invalid" });
}
