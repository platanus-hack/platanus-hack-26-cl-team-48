import { describe, expect, it } from "vitest";
import { describeFigure, toDataUrl } from "./figure-image.ts";

describe("toDataUrl", () => {
  it("embeds the figure's bytes with its type", () => {
    expect(toDataUrl({ mime: "image/png", bytes: new Uint8Array([137, 80, 78, 71]) })).toBe(
      "data:image/png;base64,iVBORw==",
    );
  });

  it("encodes figures larger than a call can take as arguments", () => {
    const bytes = new Uint8Array(200_000).fill(65);

    expect(toDataUrl({ mime: "image/png", bytes })).toHaveLength(
      "data:image/png;base64,".length + Math.ceil(bytes.length / 3) * 4,
    );
  });
});

describe("describeFigure", () => {
  const figure = { id: "d1", mime: "image/png" as const, width: 400, height: 300 };

  it("uses the figure's title as its text alternative", () => {
    expect(describeFigure({ ...figure, title: "Ventas" }, 0)).toBe("Ventas");
  });

  it("numbers untitled figures so a screen reader can tell them apart", () => {
    expect(describeFigure(figure, 1)).toBe("Gráfico 2 del código");
  });
});
