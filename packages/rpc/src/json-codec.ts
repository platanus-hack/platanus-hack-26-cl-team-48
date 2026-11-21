const BYTES_KEY = "$bytes";

/** JSON text where binary fields become `{"$bytes": "<base64>"}`, readable by any language. */
export const encodeJson = (value: unknown): string =>
  JSON.stringify(value, (_key, field: unknown) =>
    field instanceof Uint8Array ? { [BYTES_KEY]: toBase64(field) } : field,
  );

export const decodeJson = (text: string): unknown =>
  JSON.parse(text, (_key, field: unknown) =>
    isEncodedBytes(field) ? fromBase64(field[BYTES_KEY]) : field,
  );

const isEncodedBytes = (field: unknown): field is { [BYTES_KEY]: string } =>
  typeof field === "object" &&
  field !== null &&
  Object.keys(field).length === 1 &&
  typeof (field as Record<string, unknown>)[BYTES_KEY] === "string";

const toBase64 = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

const fromBase64 = (text: string): Uint8Array =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
