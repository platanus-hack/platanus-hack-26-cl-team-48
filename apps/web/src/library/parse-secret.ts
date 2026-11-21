import type { Secret } from "./flow-library.ts";

export function parseSecret(value: unknown): Secret | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    value.name.trim() === "" ||
    !("value" in value) ||
    typeof value.value !== "string"
  )
    return undefined;
  return { name: value.name, value: value.value };
}
