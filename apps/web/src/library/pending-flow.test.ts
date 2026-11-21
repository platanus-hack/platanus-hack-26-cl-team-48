import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { keepPendingFlow, takePendingFlow } from "./pending-flow.ts";

const FLOW: Flow = {
  format: FLOW_FORMAT,
  name: "Sin cuenta",
  nodes: [{ version: "0.1.0", id: "one", type: "sample", params: {}, position: { x: 0, y: 0 } }],
  edges: [],
};

/** An in-memory stand-in for sessionStorage. */
function memoryStorage() {
  const items = new Map<string, string>();
  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
  return { storage, items };
}

/** Writes `value` under the single key that keepPendingFlow uses. */
function overwriteKept(items: Map<string, string>, value: string) {
  const [key] = [...items.keys()];
  if (key === undefined) throw new Error("expected a kept flow");
  items.set(key, value);
}

describe("pending flow", () => {
  it("takes back the flow that was kept", () => {
    const { storage } = memoryStorage();
    keepPendingFlow(storage, FLOW);

    const taken = takePendingFlow(storage);

    expect(taken).toEqual(FLOW);
  });

  it("returns undefined when nothing was kept", () => {
    const { storage } = memoryStorage();

    const taken = takePendingFlow(storage);

    expect(taken).toBeUndefined();
  });

  it("returns the kept flow only once", () => {
    const { storage } = memoryStorage();
    keepPendingFlow(storage, FLOW);
    takePendingFlow(storage);

    const second = takePendingFlow(storage);

    expect(second).toBeUndefined();
  });

  it("removes the kept flow from storage when taking it", () => {
    const { storage, items } = memoryStorage();
    keepPendingFlow(storage, FLOW);

    takePendingFlow(storage);

    expect(items.size).toBe(0);
  });

  it("returns the latest kept flow when kept twice", () => {
    const { storage } = memoryStorage();
    keepPendingFlow(storage, { ...FLOW, name: "Primero" });
    keepPendingFlow(storage, { ...FLOW, name: "Segundo" });

    const taken = takePendingFlow(storage);

    expect(taken?.name).toBe("Segundo");
  });

  it("returns undefined for a kept value that is not JSON", () => {
    const { storage, items } = memoryStorage();
    keepPendingFlow(storage, FLOW);
    overwriteKept(items, "{not json");

    const taken = takePendingFlow(storage);

    expect(taken).toBeUndefined();
  });

  it("returns undefined for kept JSON that is not a flow", () => {
    const { storage, items } = memoryStorage();
    keepPendingFlow(storage, FLOW);
    overwriteKept(items, JSON.stringify({ format: "otro", nodes: "no" }));

    const taken = takePendingFlow(storage);

    expect(taken).toBeUndefined();
  });

  it("removes a kept value that is not a flow", () => {
    const { storage, items } = memoryStorage();
    keepPendingFlow(storage, FLOW);
    overwriteKept(items, "{not json");

    takePendingFlow(storage);

    expect(items.size).toBe(0);
  });
});
