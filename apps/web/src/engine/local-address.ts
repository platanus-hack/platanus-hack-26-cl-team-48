import { err, ok, type Result } from "@nodomics/protocol";
import { MESSAGES } from "../messages.ts";

export type LocalAddress = { readonly url: string; readonly token: string };

const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

export function parseLocalAddress(address: string): Result<LocalAddress, string> {
  const url = URL.parse(address);
  if (
    url === null ||
    !["ws:", "wss:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    return err(MESSAGES.engines.invalidAddress);
  if (!LOOPBACK_HOSTS.includes(url.hostname)) return err(MESSAGES.engines.loopbackRequired);
  const token = url.searchParams.get("token");
  if (url.searchParams.getAll("token").length !== 1 || token === null || token.trim() === "")
    return err(MESSAGES.engines.tokenRequired);
  url.searchParams.delete("token");
  return ok({ url: url.href, token });
}
