import { err, ok, type Result } from "@nodomics/protocol";

export type EngineConfig =
  { readonly mode: "browser" } | { readonly mode: "local"; readonly url: string };

// The local executor only listens on loopback; any other host would send the flow elsewhere.
const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

export function readEngineConfig(search: string): Result<EngineConfig, string> {
  const params = new URLSearchParams(search);
  if (!params.has("local"))
    return params.has("token")
      ? err("A token requires a local executor URL")
      : ok({ mode: "browser" });
  if (params.getAll("local").length !== 1 || params.getAll("token").length !== 1)
    return err("Provide one local executor URL and one token");
  const url = URL.parse(params.get("local") ?? "");
  const token = params.get("token");
  if (
    url === null ||
    !["ws:", "wss:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    return err("Invalid local executor WebSocket URL");
  if (!LOOPBACK_HOSTS.includes(url.hostname)) return err("Local executor host must be loopback");
  if (token === null || token.trim() === "") return err("A local executor requires a token");
  url.searchParams.set("token", token);
  return ok({ mode: "local", url: url.href });
}
