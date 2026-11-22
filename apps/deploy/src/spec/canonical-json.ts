/** JSON text that is equal for equal values, whatever the order in which object keys were written. */
export const canonicalJson = (value: unknown): string => JSON.stringify(sortKeys(value));

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([key, entry]) => [key, sortKeys(entry)]),
  );
}
