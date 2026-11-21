import { err, ok, type Result } from "@nodomics/protocol";

export const MAX_BODY_BYTES = 16 * 1024;
export const UPLOAD_MAX_BODY_BYTES = 25 * 1024 * 1024;

export type BodyLimitError = {
  readonly status: 413;
  readonly message: string;
};

export function isBodyWithinLimit(body: string | Buffer, maxBytes = MAX_BODY_BYTES): boolean {
  const bytes = typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
  return bytes <= maxBytes;
}

export function checkBodyLimit(
  body: string | Buffer,
  maxBytes = MAX_BODY_BYTES,
): Result<number, BodyLimitError> {
  const bytes = typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
  return bytes > maxBytes
    ? err({ status: 413, message: `Payload exceeds limit of ${String(maxBytes)} bytes` })
    : ok(bytes);
}
