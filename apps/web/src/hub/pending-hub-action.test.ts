import { describe, expect, it } from "vitest";
import {
  keepPendingHubAction,
  takePendingHubAction,
  type PendingHubAction,
} from "./pending-hub-action.ts";

class FakeStorage {
  readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  corruptEvery(value: string): void {
    for (const key of this.items.keys()) this.items.set(key, value);
  }
}

const VENTAS = { handle: "ana", slug: "ventas" };
const COPY_VENTAS: PendingHubAction = {
  kind: "copy",
  handle: "ana",
  slug: "ventas",
  version: "0.2.0",
};
const INSTALL_LIMPIAR: PendingHubAction = {
  kind: "install",
  handle: "ana",
  slug: "limpiar",
  version: "0.1.0",
};

describe("pending hub action", () => {
  it("gives back the kept action for its publication", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);

    const taken = takePendingHubAction(storage, VENTAS);

    expect(taken).toEqual(COPY_VENTAS);
  });

  it("keeps an install action with its version", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, INSTALL_LIMPIAR);

    const taken = takePendingHubAction(storage, { handle: "ana", slug: "limpiar" });

    expect(taken).toEqual(INSTALL_LIMPIAR);
  });

  it("gives back the action only once", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    takePendingHubAction(storage, VENTAS);

    const second = takePendingHubAction(storage, VENTAS);

    expect(second).toBeUndefined();
  });

  it("removes the action from the storage when it is taken", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);

    takePendingHubAction(storage, VENTAS);

    expect(storage.items.size).toBe(0);
  });

  it("gives back nothing when no action was kept", () => {
    const storage = new FakeStorage();

    const taken = takePendingHubAction(storage, VENTAS);

    expect(taken).toBeUndefined();
  });

  it("gives back nothing for another publication of the same owner", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);

    const taken = takePendingHubAction(storage, { handle: "ana", slug: "limpiar" });

    expect(taken).toBeUndefined();
  });

  it("gives back nothing for a publication with the same slug of another owner", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);

    const taken = takePendingHubAction(storage, { handle: "beto", slug: "ventas" });

    expect(taken).toBeUndefined();
  });

  it("leaves the action kept when asked for another publication", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    takePendingHubAction(storage, { handle: "ana", slug: "limpiar" });

    const taken = takePendingHubAction(storage, VENTAS);

    expect(taken).toEqual(COPY_VENTAS);
  });

  it("replaces the previously kept action", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    keepPendingHubAction(storage, INSTALL_LIMPIAR);

    const taken = {
      ventas: takePendingHubAction(storage, VENTAS),
      limpiar: takePendingHubAction(storage, { handle: "ana", slug: "limpiar" }),
    };

    expect(taken).toEqual({ ventas: undefined, limpiar: INSTALL_LIMPIAR });
  });

  it("gives back nothing for a kept value that is not JSON", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    storage.corruptEvery("{no es json");

    const taken = takePendingHubAction(storage, VENTAS);

    expect(taken).toBeUndefined();
  });

  it("removes a kept value that is not JSON", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    storage.corruptEvery("{no es json");

    takePendingHubAction(storage, VENTAS);

    expect(storage.items.size).toBe(0);
  });

  it("gives back nothing for a kept value with an unknown kind", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    storage.corruptEvery(JSON.stringify({ ...COPY_VENTAS, kind: "delete" }));

    const taken = takePendingHubAction(storage, VENTAS);

    expect(taken).toBeUndefined();
  });

  it("gives back nothing for a kept value without a version", () => {
    const storage = new FakeStorage();
    keepPendingHubAction(storage, COPY_VENTAS);
    storage.corruptEvery(JSON.stringify({ kind: "copy", handle: "ana", slug: "ventas" }));

    const taken = takePendingHubAction(storage, VENTAS);

    expect(taken).toBeUndefined();
  });
});
