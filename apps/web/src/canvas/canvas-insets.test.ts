import { afterEach, describe, expect, it } from "vitest";
import { canvasInsets } from "./canvas-insets.ts";

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function placeAt(selector: string, box: Box): void {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`missing test element ${selector}`);
  element.getBoundingClientRect = () => new DOMRect(box.x, box.y, box.width, box.height);
}

const canvasIn = (selector: string): Element => {
  const canvas = document.querySelector(selector);
  if (!canvas) throw new Error(`missing test canvas ${selector}`);
  return canvas;
};

const boxOf = (rect: DOMRect | undefined): Box | undefined =>
  rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };

afterEach(() => {
  document.body.innerHTML = "";
});

describe("canvas insets", () => {
  it("reads the panels inside the canvas's frame", () => {
    document.body.innerHTML = `
      <div data-canvas-frame>
        <aside id="left" data-canvas-inset="left"></aside>
        <div><div id="canvas"></div></div>
      </div>`;
    placeAt("#left", { x: 12, y: 72, width: 280, height: 516 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(boxOf(insets.left)).toEqual({ x: 12, y: 72, width: 280, height: 516 });
  });

  it("ignores panels outside the canvas's frame", () => {
    document.body.innerHTML = `
      <aside id="outside" data-canvas-inset="right"></aside>
      <div data-canvas-frame><div id="canvas"></div></div>`;
    placeAt("#outside", { x: 708, y: 72, width: 280, height: 516 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(insets.right).toBeUndefined();
  });

  it("does not see the panels of a frame beside its own", () => {
    document.body.innerHTML = `
      <div data-canvas-frame>
        <aside id="editor-top" data-canvas-inset="top"></aside>
        <div id="editor-canvas"></div>
      </div>
      <div data-canvas-frame>
        <aside id="preview-left" data-canvas-inset="left"></aside>
        <div id="preview-canvas"></div>
      </div>`;
    placeAt("#editor-top", { x: 12, y: 12, width: 976, height: 48 });
    placeAt("#preview-left", { x: 1012, y: 12, width: 200, height: 300 });

    const editor = canvasInsets(canvasIn("#editor-canvas"));
    const preview = canvasInsets(canvasIn("#preview-canvas"));

    expect(Object.keys(editor)).toEqual(["top"]);
    expect(boxOf(editor.top)).toEqual({ x: 12, y: 12, width: 976, height: 48 });
    expect(Object.keys(preview)).toEqual(["left"]);
    expect(boxOf(preview.left)).toEqual({ x: 1012, y: 12, width: 200, height: 300 });
  });

  it("uses the closest frame when frames are nested", () => {
    document.body.innerHTML = `
      <div data-canvas-frame>
        <aside id="outer-top" data-canvas-inset="top"></aside>
        <div data-canvas-frame>
          <aside id="inner-bottom" data-canvas-inset="bottom"></aside>
          <div id="canvas"></div>
        </div>
      </div>`;
    placeAt("#outer-top", { x: 0, y: 0, width: 1000, height: 48 });
    placeAt("#inner-bottom", { x: 300, y: 400, width: 400, height: 188 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(Object.keys(insets)).toEqual(["bottom"]);
  });

  it("reads the whole document when the canvas has no frame", () => {
    document.body.innerHTML = `
      <header><nav id="top" data-canvas-inset="top"></nav></header>
      <main><div id="canvas"></div></main>
      <footer><aside id="bottom" data-canvas-inset="bottom"></aside></footer>`;
    placeAt("#top", { x: 12, y: 12, width: 976, height: 48 });
    placeAt("#bottom", { x: 304, y: 400, width: 392, height: 188 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(boxOf(insets.top)).toEqual({ x: 12, y: 12, width: 976, height: 48 });
    expect(boxOf(insets.bottom)).toEqual({ x: 304, y: 400, width: 392, height: 188 });
  });

  it("leaves out a hidden panel whose width is zero", () => {
    document.body.innerHTML = `
      <div data-canvas-frame>
        <aside id="hidden" data-canvas-inset="right"></aside>
        <div id="canvas"></div>
      </div>`;
    placeAt("#hidden", { x: 0, y: 0, width: 0, height: 0 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect("right" in insets).toBe(false);
  });

  it("returns only the sides that have a panel", () => {
    document.body.innerHTML = `
      <div data-canvas-frame>
        <aside id="left" data-canvas-inset="left"></aside>
        <aside id="right" data-canvas-inset="right"></aside>
        <div id="canvas"></div>
      </div>`;
    placeAt("#left", { x: 12, y: 72, width: 280, height: 516 });
    placeAt("#right", { x: 708, y: 72, width: 280, height: 516 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(Object.keys(insets).sort()).toEqual(["left", "right"]);
  });

  it("returns no sides when the frame has no panels", () => {
    document.body.innerHTML = `<div data-canvas-frame><div id="canvas"></div></div>`;

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(insets).toEqual({});
  });

  it("takes a side from the first panel that marks it", () => {
    document.body.innerHTML = `
      <div data-canvas-frame>
        <aside id="first" data-canvas-inset="top"></aside>
        <aside id="second" data-canvas-inset="top"></aside>
        <div id="canvas"></div>
      </div>`;
    placeAt("#first", { x: 12, y: 12, width: 976, height: 48 });
    placeAt("#second", { x: 12, y: 80, width: 500, height: 40 });

    const insets = canvasInsets(canvasIn("#canvas"));

    expect(boxOf(insets.top)).toEqual({ x: 12, y: 12, width: 976, height: 48 });
  });
});
