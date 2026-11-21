export type KeyValue = { readonly name: string; readonly value?: string; readonly secret?: string };

export function parseKeyValue(value: unknown): KeyValue | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    typeof value.name !== "string"
  )
    return undefined;
  return {
    name: value.name,
    ...("value" in value && typeof value.value === "string" ? { value: value.value } : {}),
    ...("secret" in value && typeof value.secret === "string" ? { secret: value.secret } : {}),
  };
}

export const keyValuesOf = (value: unknown): ReadonlyArray<KeyValue> =>
  Array.isArray(value)
    ? value.flatMap((item: unknown) => {
        const parsed = parseKeyValue(item);
        return parsed === undefined ? [] : [parsed];
      })
    : [];
