import { err, ok, type Result } from "@nodomics/protocol";

/** Request bodies are untrusted text; a malformed one is an expected failure, not a bug. */
export function parseJson(raw: string): Result<unknown, null> {
  try {
    return ok(JSON.parse(raw) as unknown);
  } catch {
    return err(null);
  }
}
