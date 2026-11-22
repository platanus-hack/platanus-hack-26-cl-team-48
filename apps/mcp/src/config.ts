import { err, ok, type Result } from "@nodomics/protocol";

export type McpConfig = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly port: number;
};
type ConfigIssue = { readonly variable: string; readonly kind: "missing" | "invalid" };
const DEFAULT_PORT = 8790;
const MAX_PORT = 65535;
export function loadConfig(
  env: Readonly<Record<string, string | undefined>>,
): Result<McpConfig, { readonly issues: readonly ConfigIssue[] }> {
  const supabaseUrl = env["SUPABASE_URL"]?.trim() ?? "";
  const supabaseAnonKey = env["SUPABASE_ANON_KEY"]?.trim() ?? "";
  const port = env["PORT"] === undefined ? DEFAULT_PORT : Number(env["PORT"]);
  const issues: ConfigIssue[] = [];
  if (!supabaseUrl) issues.push({ variable: "SUPABASE_URL", kind: "missing" });
  else if (!isHttps(supabaseUrl)) issues.push({ variable: "SUPABASE_URL", kind: "invalid" });
  if (!supabaseAnonKey) issues.push({ variable: "SUPABASE_ANON_KEY", kind: "missing" });
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT)
    issues.push({ variable: "PORT", kind: "invalid" });
  return issues.length === 0 ? ok({ supabaseUrl, supabaseAnonKey, port }) : err({ issues });
}
function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
