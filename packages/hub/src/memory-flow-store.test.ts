import { describe, expect, it } from "vitest";
import type { FlowDraft, FlowStore } from "./flow-store.ts";
import type { Hub, HubProfile } from "./hub.ts";
import { createMemoryHub } from "./memory-hub.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };
const beto: HubProfile = { id: "u-beto", handle: "beto", displayName: "Beto" };

type MemoryHub = Hub & FlowStore;

function clock(): () => string {
  let tick = 0;
  return () => {
    tick += 1;
    return new Date(Date.UTC(2026, 10, 21, 0, 0, tick)).toISOString();
  };
}

function fixedClock(times: ReadonlyArray<string>): () => string {
  let index = 0;
  return () => {
    const time = times[Math.min(index, times.length - 1)] ?? "";
    index += 1;
    return time;
  };
}

function newHub(now: () => string = clock()): MemoryHub {
  return createMemoryHub({ profiles: [ana, beto], now });
}

function draft(overrides: Partial<FlowDraft> = {}): FlowDraft {
  return {
    id: "flujo-1",
    visibility: "private",
    document: { name: "Ventas", nodes: [{ id: "n1" }] },
    ...overrides,
  };
}

async function signIn(hub: MemoryHub, profile: HubProfile): Promise<MemoryHub> {
  await hub.signIn({ kind: "email", email: profile.handle });
  return hub;
}

async function valueOf<T>(
  promise: Promise<{ ok: true; value: T } | { ok: false; error: unknown }>,
): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

async function saveAs(hub: MemoryHub, profile: HubProfile, flow: FlowDraft): Promise<void> {
  await signIn(hub, profile);
  await valueOf(hub.saveOwnFlow(flow));
  await hub.signOut();
}

describe("createMemoryHub: flow store signed out", () => {
  it("rejects listing own flows", async () => {
    const hub = newHub();

    const result = await hub.listOwnFlows();

    expect(result).toEqual({ ok: false, error: { kind: "signed-out" } });
  });

  it("rejects saving a flow", async () => {
    const hub = newHub();

    const result = await hub.saveOwnFlow(draft());

    expect(result).toEqual({ ok: false, error: { kind: "signed-out" } });
  });

  it("rejects deleting a flow", async () => {
    const hub = newHub();

    const result = await hub.deleteOwnFlow("flujo-1");

    expect(result).toEqual({ ok: false, error: { kind: "signed-out" } });
  });

  it("reads a public flow", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "public" }));

    const flow = await valueOf(hub.readFlow("flujo-1"));

    expect(flow?.id).toBe("flujo-1");
    expect(flow?.visibility).toBe("public");
    expect(flow?.ownerId).toBe(ana.id);
  });

  it("does not read a private flow", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "private" }));

    const result = await hub.readFlow("flujo-1");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("reads an unknown flow as undefined", async () => {
    const hub = newHub();

    const result = await hub.readFlow("no-existe");

    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("createMemoryHub: saving own flows", () => {
  it("creates the flow owned by the signed-in profile at the current time", async () => {
    const hub = await signIn(newHub(fixedClock(["2026-11-21T10:00:00.000Z"])), ana);

    const result = await hub.saveOwnFlow(draft());

    expect(result.ok).toBe(true);
    expect(await valueOf(hub.readFlow("flujo-1"))).toEqual({
      id: "flujo-1",
      ownerId: ana.id,
      visibility: "private",
      document: { name: "Ventas", nodes: [{ id: "n1" }] },
      updatedAt: "2026-11-21T10:00:00.000Z",
    });
  });

  it("replaces visibility and document when saving the same id again", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft()));

    await valueOf(hub.saveOwnFlow(draft({ visibility: "public", document: { name: "Ventas 2" } })));

    const flow = await valueOf(hub.readFlow("flujo-1"));
    expect(flow?.visibility).toBe("public");
    expect(flow?.document).toEqual({ name: "Ventas 2" });
  });

  it("updates updatedAt when saving the same id again", async () => {
    const hub = await signIn(
      newHub(fixedClock(["2026-11-21T10:00:00.000Z", "2026-11-21T11:00:00.000Z"])),
      ana,
    );
    await valueOf(hub.saveOwnFlow(draft()));

    await valueOf(hub.saveOwnFlow(draft({ document: { name: "Otra" } })));

    expect((await valueOf(hub.readFlow("flujo-1")))?.updatedAt).toBe("2026-11-21T11:00:00.000Z");
  });

  it("keeps a single flow when saving the same id again", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft()));

    await valueOf(hub.saveOwnFlow(draft({ visibility: "public" })));

    expect((await valueOf(hub.listOwnFlows())).map((flow) => flow.id)).toEqual(["flujo-1"]);
  });

  it("stores a copy of the document", async () => {
    const hub = await signIn(newHub(), ana);
    const document = { name: "Ventas", nodes: [{ id: "n1" }] };
    await valueOf(hub.saveOwnFlow(draft({ document })));

    document.name = "Cambiado";
    document.nodes.push({ id: "n2" });

    expect((await valueOf(hub.readFlow("flujo-1")))?.document).toEqual({
      name: "Ventas",
      nodes: [{ id: "n1" }],
    });
  });
});

describe("createMemoryHub: saving own flows without visibility", () => {
  const withoutVisibility = (document: unknown = { name: "Ventas" }): FlowDraft => ({
    id: "flujo-1",
    document,
  });

  it("creates a private flow when the draft has no visibility", async () => {
    const hub = await signIn(newHub(), ana);

    await valueOf(hub.saveOwnFlow(withoutVisibility()));

    expect((await valueOf(hub.readFlow("flujo-1")))?.visibility).toBe("private");
  });

  it("keeps a public flow public when saved again without visibility", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft({ visibility: "public" })));

    await valueOf(hub.saveOwnFlow(withoutVisibility()));

    expect((await valueOf(hub.readFlow("flujo-1")))?.visibility).toBe("public");
  });

  it("keeps a private flow private when saved again without visibility", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft({ visibility: "private" })));

    await valueOf(hub.saveOwnFlow(withoutVisibility()));

    expect((await valueOf(hub.readFlow("flujo-1")))?.visibility).toBe("private");
  });

  it("replaces the document when saved again without visibility", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft({ visibility: "public" })));

    await valueOf(hub.saveOwnFlow(withoutVisibility({ name: "Ventas 2" })));

    expect((await valueOf(hub.readFlow("flujo-1")))?.document).toEqual({ name: "Ventas 2" });
  });
});

describe("createMemoryHub: listing own flows", () => {
  it("lists nothing for a profile without flows", async () => {
    const hub = await signIn(newHub(), ana);

    const flows = await valueOf(hub.listOwnFlows());

    expect(flows).toEqual([]);
  });

  it("lists own flows most recently updated first", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft({ id: "a" })));
    await valueOf(hub.saveOwnFlow(draft({ id: "b" })));
    await valueOf(hub.saveOwnFlow(draft({ id: "c" })));

    await valueOf(hub.saveOwnFlow(draft({ id: "a", document: { name: "Editado" } })));

    expect((await valueOf(hub.listOwnFlows())).map((flow) => flow.id)).toEqual(["a", "c", "b"]);
  });

  it("lists private and public own flows", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft({ id: "privado", visibility: "private" })));
    await valueOf(hub.saveOwnFlow(draft({ id: "publico", visibility: "public" })));

    const flows = await valueOf(hub.listOwnFlows());

    expect(flows.map((flow) => flow.visibility).sort()).toEqual(["private", "public"]);
  });

  it("lists only the signed-in profile's flows", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ id: "de-ana", visibility: "public" }));
    await saveAs(hub, beto, draft({ id: "de-beto" }));
    await signIn(hub, beto);

    const flows = await valueOf(hub.listOwnFlows());

    expect(flows.map((flow) => flow.id)).toEqual(["de-beto"]);
    expect(flows.every((flow) => flow.ownerId === beto.id)).toBe(true);
  });
});

describe("createMemoryHub: another profile's flows", () => {
  it("does not read another profile's private flow", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "private" }));
    await signIn(hub, beto);

    const result = await hub.readFlow("flujo-1");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("reads another profile's public flow", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "public" }));
    await signIn(hub, beto);

    const flow = await valueOf(hub.readFlow("flujo-1"));

    expect(flow?.ownerId).toBe(ana.id);
    expect(flow?.document).toEqual({ name: "Ventas", nodes: [{ id: "n1" }] });
  });

  it("rejects saving over another profile's flow without changing it", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "public" }));
    await signIn(hub, beto);
    const before = await valueOf(hub.readFlow("flujo-1"));

    const result = await hub.saveOwnFlow(
      draft({ visibility: "public", document: { name: "Robo" } }),
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid");
    expect(await valueOf(hub.readFlow("flujo-1"))).toEqual(before);
  });

  it("does not make another profile's private flow readable by saving over it", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "private" }));
    await signIn(hub, beto);

    const result = await hub.saveOwnFlow(draft({ visibility: "public" }));

    expect(!result.ok && result.error.kind).toBe("invalid");
    expect(await hub.readFlow("flujo-1")).toEqual({ ok: true, value: undefined });
    await hub.signOut();
    await signIn(hub, ana);
    expect((await valueOf(hub.readFlow("flujo-1")))?.visibility).toBe("private");
  });

  it("rejects deleting another profile's flow without removing it", async () => {
    const hub = newHub();
    await saveAs(hub, ana, draft({ visibility: "public" }));
    await signIn(hub, beto);

    const result = await hub.deleteOwnFlow("flujo-1");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid");
    expect((await valueOf(hub.readFlow("flujo-1")))?.id).toBe("flujo-1");
  });
});

describe("createMemoryHub: deleting own flows", () => {
  it("removes the flow", async () => {
    const hub = await signIn(newHub(), ana);
    await valueOf(hub.saveOwnFlow(draft()));

    const result = await hub.deleteOwnFlow("flujo-1");

    expect(result.ok).toBe(true);
    expect(await hub.readFlow("flujo-1")).toEqual({ ok: true, value: undefined });
    expect(await valueOf(hub.listOwnFlows())).toEqual([]);
  });

  it("accepts deleting an unknown id", async () => {
    const hub = await signIn(newHub(), ana);

    const result = await hub.deleteOwnFlow("no-existe");

    expect(result.ok).toBe(true);
  });
});
