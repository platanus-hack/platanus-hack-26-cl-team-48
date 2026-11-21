import { err, ok, type Result } from "@nodomics/protocol";

const PATH_SEPARATOR = ".";

/**
 * The records of a JSON response: the array found at a dotted path (`data.items`). Without a path
 * the response itself, an object being a single record.
 */
export function extractRecords(body: unknown, path: string): Result<unknown[], string> {
  const steps = path.split(PATH_SEPARATOR).filter((step) => step !== "");
  if (steps.length === 0) return ok(Array.isArray(body) ? body : [body]);
  const found = steps.reduce<unknown>((value, step) => fieldOf(value, step), body);
  return Array.isArray(found) ? ok(found) : err(`En "${path}" no hay una lista de registros`);
}

const fieldOf = (value: unknown, field: string): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.getOwnPropertyDescriptor(value, field)?.value
    : undefined;
