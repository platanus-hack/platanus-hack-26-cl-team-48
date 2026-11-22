import { describe, expect, it } from "vitest";
import {
  checkBodyLimit,
  isBodyWithinLimit,
  MAX_BODY_BYTES,
  UPLOAD_MAX_BODY_BYTES,
} from "../src/http/guards/body-limit.ts";

describe("body-limit guard", () => {
  it("allows bodies up to 16 KB", () => {
    const exactly16Kb = "a".repeat(MAX_BODY_BYTES);
    expect(isBodyWithinLimit(exactly16Kb)).toBe(true);

    const result = checkBodyLimit(exactly16Kb);
    expect(result.ok).toBe(true);
  });

  it("rejects bodies exceeding 16 KB with 413", () => {
    const tooLarge = "a".repeat(MAX_BODY_BYTES + 1);
    expect(isBodyWithinLimit(tooLarge)).toBe(false);

    const result = checkBodyLimit(tooLarge);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(413);
      expect(result.error.message).toContain("16384");
    }
  });

  it("calculates multi-byte utf8 characters correctly", () => {
    // Each 'ñ' is 2 bytes in UTF-8
    const multiByte = "ñ".repeat(8193); // 16386 bytes
    const result = checkBodyLimit(multiByte);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(413);
    }
  });

  it("allows bodies up to 25 MB when upload limit is specified", () => {
    const oneMb = "a".repeat(1024 * 1024);
    expect(isBodyWithinLimit(oneMb, UPLOAD_MAX_BODY_BYTES)).toBe(true);
    const result = checkBodyLimit(oneMb, UPLOAD_MAX_BODY_BYTES);
    expect(result.ok).toBe(true);
  });
});
