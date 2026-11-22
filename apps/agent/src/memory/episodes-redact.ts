const SECRET_KEY = /token|authorization|secret|password|api[-_]?key|cookie|credential|headers?$/i;
const BEARER_VALUE = /Bearer\s+[^\s"',;]+/gi;
const REDACTED = "[redacted]";

export function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") return value.replace(BEARER_VALUE, `Bearer ${REDACTED}`);
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object" && value !== null) return redactObject(value);
  return value;
}

function redactObject(value: object): Record<string, unknown> {
  const entries = Object.entries(value).filter(([key]) => !SECRET_KEY.test(key));
  return Object.fromEntries(entries.map(([key, inner]) => [key, redactSecrets(inner)]));
}
