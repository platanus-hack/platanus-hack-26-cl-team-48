import { describe, expect, it } from "vitest";
import { changePreviewSize, DEFAULT_PREVIEW_SIZE } from "./preview-size.ts";

describe("preview size", () => {
  it("starts at the panel height of the design", () => {
    expect(DEFAULT_PREVIEW_SIZE).toEqual({ height: 38, mode: "expanded" });
  });
  it("clamps resizing to the available range", () => {
    expect(changePreviewSize(DEFAULT_PREVIEW_SIZE, { type: "resize", height: 200 })).toEqual({
      height: 70,
      mode: "expanded",
    });
    expect(changePreviewSize(DEFAULT_PREVIEW_SIZE, { type: "resize", height: -20 })).toEqual({
      height: 20,
      mode: "expanded",
    });
  });
  it("restores the chosen height after maximizing", () => {
    const resized = changePreviewSize(DEFAULT_PREVIEW_SIZE, { type: "resize", height: 55 });
    expect(changePreviewSize(resized, { type: "maximize" }).mode).toBe("maximized");
    expect(
      changePreviewSize(changePreviewSize(resized, { type: "maximize" }), { type: "restore" }),
    ).toEqual(resized);
  });
});
