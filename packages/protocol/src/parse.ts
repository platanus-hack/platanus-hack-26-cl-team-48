import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { err, ok, type Result } from "./result.ts";

export type ValidationIssue = { readonly path: string; readonly message: string };

/** Validates untrusted data at a boundary and returns it typed, or the list of problems. */
export function parse<S extends TSchema>(
  schema: S,
  value: unknown,
): Result<Static<S>, ValidationIssue[]> {
  return Value.Check(schema, value)
    ? ok(value)
    : err([...Value.Errors(schema, value)].map(({ path, message }) => ({ path, message })));
}
