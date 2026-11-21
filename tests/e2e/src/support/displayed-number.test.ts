import { describe, expect, it } from "vitest";
import { parseDisplayedNumber } from "./displayed-number.ts";

describe("parseDisplayedNumber", () => {
  it("reads a Spanish decimal with thousands grouping", () => {
    expect(parseDisplayedNumber("1.234,567")).toBe(1234.567);
  });

  it("reads negative numbers written with a hyphen or a minus sign", () => {
    expect(parseDisplayedNumber("-0,25")).toBe(-0.25);
    expect(parseDisplayedNumber("−0,25")).toBe(-0.25);
  });

  it("rejects text that is not a number", () => {
    expect(() => parseDisplayedNumber("Sur")).toThrow(/Sur/);
  });
});
