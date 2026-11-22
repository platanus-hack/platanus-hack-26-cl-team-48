import { err, ok, type Result } from "@nodomics/protocol";

export type DeployConfig = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly renderApiKey: string;
  readonly renderOwnerId: string;
  readonly allowedOrigins: readonly string[];
  readonly port: number;
};
export type ConfigIssue = { readonly variable: string; readonly kind: "missing" | "invalid" };

const DEFAULT_PORT = 8791;
const MAX_PORT = 65535;

/** Reads the configuration once at startup; issues name the variable, never its value. */
export function loadConfig(
  env: Readonly<Record<string, string | undefined>>,
): Result<DeployConfig, { readonly issues: readonly ConfigIssue[] }> {
  const text = (variable: string) => env[variable]?.trim() ?? "";
  const supabaseUrl = text("SUPABASE_URL");
  const port = env["PORT"] === undefined ? DEFAULT_PORT : Number(env["PORT"]);
  const issues = [
    ...urlIssues(supabaseUrl),
    ...["SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RENDER_API_KEY", "RENDER_OWNER_ID"]
      .filter((variable) => text(variable) === "")
      .map((variable) => ({ variable, kind: "missing" as const })),
    ...(isValidPort(port) ? [] : [{ variable: "PORT", kind: "invalid" as const }]),
  ];
  return issues.length > 0
    ? err({ issues })
    : ok({
        supabaseUrl,
        supabaseAnonKey: text("SUPABASE_ANON_KEY"),
        supabaseServiceRoleKey: text("SUPABASE_SERVICE_ROLE_KEY"),
        renderApiKey: text("RENDER_API_KEY"),
        renderOwnerId: text("RENDER_OWNER_ID"),
        allowedOrigins: originsOf(env["DEPLOY_ALLOWED_ORIGINS"] ?? ""),
        port,
      });
}

function urlIssues(supabaseUrl: string): ConfigIssue[] {
  if (supabaseUrl === "") return [{ variable: "SUPABASE_URL", kind: "missing" }];
  return isHttps(supabaseUrl) ? [] : [{ variable: "SUPABASE_URL", kind: "invalid" }];
}

const isValidPort = (port: number): boolean =>
  Number.isInteger(port) && port >= 1 && port <= MAX_PORT;

const originsOf = (list: string): string[] =>
  list
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
