import { describe, expect, it } from "vitest";
import { textSeparatorOf } from "./text-separator.ts";

describe("textSeparatorOf", () => {
  it.each([
    ["a,b|c;d\te", "\t"],
    ["a,b|c;d", ";"],
    ["a,b|c", "|"],
    ["a,b", ","],
    ["a;b\r\n1;2", ";"],
    ["plain\nsecond;line", undefined],
    ["42", undefined],
    ["", undefined],
  ])("selects the priority separator from the first line of %j", (text, separator) => {
    expect(textSeparatorOf(new TextEncoder().encode(text))).toBe(separator);
  });
});
