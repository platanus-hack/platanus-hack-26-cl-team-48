import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when test globals are enabled, and this repository keeps them off.
afterEach(cleanup);

// jsdom does not implement modal dialogs yet; open them in place so tests can query them by role.
if (
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal !== "function"
) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

// React Flow reads the zoom of a node from its CSS transform through DOMMatrixReadOnly, which
// jsdom lacks; this is the minimal stand-in its documentation suggests for tests.
if (typeof window !== "undefined" && typeof globalThis.DOMMatrixReadOnly === "undefined") {
  class DOMMatrixReadOnlyStub {
    readonly m22: number;
    constructor(transform?: string) {
      const scale = /scale\(([\d.]+)\)/.exec(transform ?? "")?.[1];
      this.m22 = scale === undefined ? 1 : Number(scale);
    }
  }
  Object.defineProperty(globalThis, "DOMMatrixReadOnly", { value: DOMMatrixReadOnlyStub });
}
