import { describe, expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { parse } from "./parse.ts";

const Point = Type.Object({ x: Type.Number(), y: Type.Number() });

describe("parse", () => {
  it("returns the value when it matches the schema", () => {
    expect(parse(Point, { x: 1, y: 2 })).toEqual({ ok: true, value: { x: 1, y: 2 } });
  });

  it("returns issues with the path of each invalid field", () => {
    const result = parse(Point, { x: "1" });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["/x", "/y"]),
    );
  });
});
