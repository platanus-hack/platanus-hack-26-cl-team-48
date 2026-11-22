import { describe, expect, it } from "vitest";
import { FLOW_FORMAT, type Flow, type NodeManifest } from "@nodomics/protocol";
import type { Hub, HubProfile, PublicationDraft } from "./hub.ts";
import { createMemoryHub } from "./memory-hub.ts";
import { SNAPSHOT_FORMAT, type Snapshot } from "./snapshot.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };
const beto: HubProfile = {
  id: "u-beto",
  handle: "beto",
  displayName: "Beto",
  avatarUrl: "https://example.com/beto.png",
};

const flow: Flow = {
  format: FLOW_FORMAT,
  name: "Ventas",
  nodes: [{ id: "n1", type: "source.csv", version: "0.1.0", params: {}, position: { x: 0, y: 0 } }],
  edges: [],
};

const manifest: NodeManifest = {
  id: "hub.ana.limpiar",
  version: "0.1.0",
  name: "Limpiar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: {} },
  impl: { kind: "sql", template: "select * from {{in}}" },
};

const bareSnapshot: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [] };

const stateSnapshot: Snapshot = {
  format: SNAPSHOT_FORMAT,
  catalog: [],
  state: {
    nodes: { n1: { state: "done" } },
    results: {},
    displays: {},
    schemas: {},
    pages: {},
    profiles: {},
    views: {},
    figures: {},
  },
};

function draft(overrides: Partial<PublicationDraft> = {}): PublicationDraft {
  return {
    slug: "ventas",
    kind: "flow",
    title: "Ventas por región",
    description: "Suma las ventas",
    tags: ["ventas"],
    version: "0.1.0",
    flow,
    snapshot: bareSnapshot,
    ...overrides,
  };
}

function clock(): () => string {
  let tick = 0;
  return () => {
    tick += 1;
    return new Date(Date.UTC(2026, 10, 21, 0, 0, tick)).toISOString();
  };
}

function newHub(): Hub {
  return createMemoryHub({ profiles: [ana, beto], now: clock() });
}

async function signedInAs(profile: HubProfile, hub: Hub = newHub()): Promise<Hub> {
  await hub.signIn({ kind: "email", email: profile.handle });
  return hub;
}

async function valueOf<T>(
  promise: Promise<{ ok: true; value: T } | { ok: false; error: unknown }>,
) {
  const result = await promise;
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe("createMemoryHub: session", () => {
  it("starts signed out", async () => {
    const hub = newHub();

    const profile = await hub.currentProfile();

    expect(profile).toBeUndefined();
  });

  it("signs in by email the profile whose handle matches", async () => {
    const hub = newHub();

    const result = await hub.signIn({ kind: "email", email: "beto" });

    expect(result.ok).toBe(true);
    expect(await hub.currentProfile()).toEqual(beto);
  });

  it("rejects an email that matches no profile", async () => {
    const hub = newHub();

    const result = await hub.signIn({ kind: "email", email: "nadie@example.com" });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid");
    expect(await hub.currentProfile()).toBeUndefined();
  });

  it("signs in the first profile with a provider", async () => {
    const hub = newHub();

    await hub.signIn({ kind: "provider", provider: "github" });

    expect(await hub.currentProfile()).toEqual(ana);
  });

  it("signs out", async () => {
    const hub = await signedInAs(ana);

    await hub.signOut();

    expect(await hub.currentProfile()).toBeUndefined();
  });

  it("notifies listeners on sign in and sign out", async () => {
    const hub = newHub();
    const seen: (HubProfile | undefined)[] = [];
    hub.onProfileChange((profile) => seen.push(profile));

    await hub.signIn({ kind: "email", email: "ana" });
    await hub.signOut();

    expect(seen).toEqual([ana, undefined]);
  });

  it("stops notifying a listener after it unsubscribes", async () => {
    const hub = newHub();
    const seen: (HubProfile | undefined)[] = [];
    const unsubscribe = hub.onProfileChange((profile) => seen.push(profile));
    await hub.signIn({ kind: "email", email: "ana" });

    unsubscribe();
    await hub.signOut();

    expect(seen).toEqual([ana]);
  });
});

describe("createMemoryHub: profile", () => {
  it("returns a known profile by handle", async () => {
    const hub = newHub();

    const result = await hub.profile("beto");

    expect(result).toEqual({ ok: true, value: beto });
  });

  it("returns undefined for an unknown handle", async () => {
    const hub = newHub();

    const result = await hub.profile("nadie");

    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("createMemoryHub: publish", () => {
  it("refuses to publish while signed out", async () => {
    const hub = newHub();

    const result = await hub.publish(draft());

    expect(result).toEqual({ ok: false, error: { kind: "signed-out" } });
  });

  it("creates a publication owned by the signed-in profile", async () => {
    const hub = await signedInAs(beto);

    const summary = await valueOf(hub.publish(draft({ tags: ["ventas", "región"] })));

    expect(summary).toMatchObject({
      slug: "ventas",
      kind: "flow",
      title: "Ventas por región",
      description: "Suma las ventas",
      tags: ["ventas", "región"],
      license: "MIT",
      latestVersion: "0.1.0",
      updatedAt: "2026-11-21T00:00:01.000Z",
      owner: { handle: "beto", displayName: "Beto", avatarUrl: "https://example.com/beto.png" },
    });
    expect(typeof summary.id).toBe("string");
  });

  it("never exposes the owner's id", async () => {
    const hub = await signedInAs(ana);

    const summary = await valueOf(hub.publish(draft()));

    expect(summary.owner).toEqual({ handle: "ana", displayName: "Ana Pérez" });
    expect(summary.owner).not.toHaveProperty("id");
  });

  it("adds a strictly newer version to an existing publication", async () => {
    const hub = await signedInAs(ana);
    const first = await valueOf(hub.publish(draft({ version: "0.1.9" })));

    const second = await valueOf(hub.publish(draft({ version: "0.1.10" })));

    expect(second.id).toBe(first.id);
    expect(second.latestVersion).toBe("0.1.10");
    expect(second.updatedAt).toBe("2026-11-21T00:00:02.000Z");
  });

  it("rejects a version equal to the latest", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ version: "0.2.0" }));

    const result = await hub.publish(draft({ version: "0.2.0" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("stale-version");
  });

  it("rejects a version older than the latest, comparing numerically", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ version: "0.1.10" }));

    const result = await hub.publish(draft({ version: "0.1.9" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("stale-version");
  });

  it("keeps the latest version after a stale publish", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ version: "0.3.0" }));
    await hub.publish(draft({ version: "0.2.0" }));

    const detail = await valueOf(hub.publication("ana", "ventas"));

    expect(detail?.latestVersion).toBe("0.3.0");
    expect(detail?.versions.map((v) => v.version)).toEqual(["0.3.0"]);
  });

  it("rejects publishing a different kind under an existing slug", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ kind: "flow", version: "0.1.0" }));

    const result = await hub.publish(draft({ kind: "node", manifest, version: "0.2.0" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("kind-mismatch");
  });

  it("updates title, description and tags from the latest draft", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ version: "0.1.0" }));

    const summary = await valueOf(
      hub.publish(draft({ version: "0.1.1", title: "Nuevo", description: "Otra", tags: ["mapa"] })),
    );

    expect(summary).toMatchObject({ title: "Nuevo", description: "Otra", tags: ["mapa"] });
  });

  it("lets different owners use the same slug independently", async () => {
    const hub = await signedInAs(ana);
    const ofAna = await valueOf(hub.publish(draft({ version: "1.0.0" })));
    await signedInAs(beto, hub);

    const ofBeto = await valueOf(hub.publish(draft({ version: "0.1.0", kind: "node", manifest })));

    expect(ofBeto.id).not.toBe(ofAna.id);
    expect(ofBeto.owner.handle).toBe("beto");
    expect(ofBeto.latestVersion).toBe("0.1.0");
    expect((await valueOf(hub.publication("ana", "ventas")))?.latestVersion).toBe("1.0.0");
  });
});

describe("createMemoryHub: search", () => {
  async function seeded(): Promise<Hub> {
    const hub = await signedInAs(ana);
    await hub.publish(
      draft({ slug: "ventas", title: "Ventas por región", description: "", tags: [] }),
    );
    await hub.publish(
      draft({
        slug: "limpiar",
        kind: "node",
        manifest,
        title: "Limpiar",
        description: "Quita filas vacías",
        tags: [],
      }),
    );
    await signedInAs(beto, hub);
    await hub.publish(
      draft({ slug: "mapa", title: "Mapa", description: "Puntos", tags: ["Geografía"] }),
    );
    return hub;
  }

  it("returns everything newest first when there is no text", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({}));

    expect(results.map((p) => p.slug)).toEqual(["mapa", "limpiar", "ventas"]);
  });

  it("treats empty text as matching everything", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "" }));

    expect(results).toHaveLength(3);
  });

  it("matches the title ignoring case and accents", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "REGION" }));

    expect(results.map((p) => p.slug)).toEqual(["ventas"]);
  });

  it("matches the description as a substring", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "vacias" }));

    expect(results.map((p) => p.slug)).toEqual(["limpiar"]);
  });

  it("matches any tag", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "geograf" }));

    expect(results.map((p) => p.slug)).toEqual(["mapa"]);
  });

  it("matches the owner's handle", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "ana" }));

    expect(results.map((p) => p.slug)).toEqual(["limpiar", "ventas"]);
  });

  it("filters by kind", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ kind: "node" }));

    expect(results.map((p) => p.slug)).toEqual(["limpiar"]);
  });

  it("combines text and kind", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "ana", kind: "flow" }));

    expect(results.map((p) => p.slug)).toEqual(["ventas"]);
  });

  it("returns an empty list when nothing matches", async () => {
    const hub = await seeded();

    const results = await valueOf(hub.search({ text: "inexistente" }));

    expect(results).toEqual([]);
  });

  it("orders by the latest update, not by creation", async () => {
    const hub = await seeded();
    await signedInAs(ana, hub);
    await hub.publish(
      draft({ slug: "ventas", title: "Ventas por región", description: "", version: "0.2.0" }),
    );

    const results = await valueOf(hub.search({}));

    expect(results.map((p) => p.slug)).toEqual(["ventas", "mapa", "limpiar"]);
  });

  it("works while signed out", async () => {
    const hub = await seeded();
    await hub.signOut();

    const results = await valueOf(hub.search({}));

    expect(results).toHaveLength(3);
  });
});

describe("createMemoryHub: publicationsOf", () => {
  it("lists one owner's publications newest first", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ slug: "primero" }));
    await hub.publish(draft({ slug: "segundo" }));
    await signedInAs(beto, hub);
    await hub.publish(draft({ slug: "de-beto" }));

    const results = await valueOf(hub.publicationsOf("ana"));

    expect(results.map((p) => p.slug)).toEqual(["segundo", "primero"]);
  });

  it("returns an empty list for an unknown handle", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft());

    const results = await valueOf(hub.publicationsOf("nadie"));

    expect(results).toEqual([]);
  });
});

describe("createMemoryHub: publication", () => {
  it("returns the detail with versions newest first and whether each has state", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ version: "0.1.9", snapshot: stateSnapshot }));
    await hub.publish(draft({ version: "0.1.10", snapshot: bareSnapshot }));

    const detail = await valueOf(hub.publication("ana", "ventas"));

    expect(detail).toMatchObject({ slug: "ventas", latestVersion: "0.1.10" });
    expect(detail?.versions).toEqual([
      { version: "0.1.10", createdAt: "2026-11-21T00:00:02.000Z", hasState: false },
      { version: "0.1.9", createdAt: "2026-11-21T00:00:01.000Z", hasState: true },
    ]);
  });

  it("returns undefined for an unknown slug", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft());

    const result = await hub.publication("ana", "otro");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("returns undefined for a slug that belongs to another owner", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft());

    const result = await hub.publication("beto", "ventas");

    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("createMemoryHub: version", () => {
  it("returns the published flow, manifest and snapshot of a version", async () => {
    const hub = await signedInAs(ana);
    const summary = await valueOf(
      hub.publish(draft({ kind: "node", manifest, snapshot: stateSnapshot })),
    );

    const published = await valueOf(hub.version(summary.id, "0.1.0"));

    expect(published).toEqual({
      version: "0.1.0",
      createdAt: "2026-11-21T00:00:01.000Z",
      flow,
      manifest,
      snapshot: stateSnapshot,
    });
  });

  it("returns each version's own content", async () => {
    const hub = await signedInAs(ana);
    const renamed: Flow = { ...flow, name: "Ventas v2" };
    const summary = await valueOf(hub.publish(draft({ version: "0.1.0" })));
    await hub.publish(draft({ version: "0.2.0", flow: renamed }));

    const old = await valueOf(hub.version(summary.id, "0.1.0"));

    expect(old.flow).toEqual(flow);
  });

  it("rejects an unknown version", async () => {
    const hub = await signedInAs(ana);
    const summary = await valueOf(hub.publish(draft()));

    const result = await hub.version(summary.id, "9.9.9");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid");
  });

  it("rejects an unknown publication", async () => {
    const hub = newHub();

    const result = await hub.version("no-existe", "0.1.0");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid");
  });
});

describe("createMemoryHub: ownPublication", () => {
  it("refuses while signed out", async () => {
    const hub = newHub();

    const result = await hub.ownPublication("ventas");

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("signed-out");
  });

  it("returns the signed-in owner's publication with that slug", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft({ version: "0.4.0" }));

    const own = await valueOf(hub.ownPublication("ventas"));

    expect(own).toMatchObject({ slug: "ventas", latestVersion: "0.4.0", owner: { handle: "ana" } });
  });

  it("ignores another owner's publication with the same slug", async () => {
    const hub = await signedInAs(ana);
    await hub.publish(draft());
    await signedInAs(beto, hub);

    const result = await hub.ownPublication("ventas");

    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("createMemoryHub: guest session", () => {
  it("starts a guest session successfully", async () => {
    const hub = newHub();

    const result = await hub.startGuestSession();

    expect(result.ok).toBe(true);
  });

  it("has no current profile during a guest session", async () => {
    const hub = newHub();

    await hub.startGuestSession();

    expect(await hub.currentProfile()).toBeUndefined();
  });

  it("does not notify profile listeners when a guest session starts", async () => {
    const hub = newHub();
    const seen: Array<HubProfile | undefined> = [];
    hub.onProfileChange((profile) => seen.push(profile));

    await hub.startGuestSession();

    expect(seen).toEqual([]);
  });

  it("signs in normally after a guest session", async () => {
    const hub = newHub();
    await hub.startGuestSession();

    const result = await hub.signIn({ kind: "email", email: "beto" });

    expect(result.ok).toBe(true);
    expect(await hub.currentProfile()).toEqual(beto);
  });

  it("notifies listeners of the sign in that follows a guest session", async () => {
    const hub = newHub();
    const seen: Array<HubProfile | undefined> = [];
    hub.onProfileChange((profile) => seen.push(profile));
    await hub.startGuestSession();

    await hub.signIn({ kind: "email", email: "ana" });

    expect(seen).toEqual([ana]);
  });

  it("keeps the current profile when a guest session starts while signed in", async () => {
    const hub = await signedInAs(ana);

    await hub.startGuestSession();

    expect(await hub.currentProfile()).toEqual(ana);
  });

  it("does not notify listeners when a guest session starts while signed in", async () => {
    const hub = await signedInAs(ana);
    const seen: Array<HubProfile | undefined> = [];
    hub.onProfileChange((profile) => seen.push(profile));

    await hub.startGuestSession();

    expect(seen).toEqual([]);
  });

  it("refuses to publish during a guest session", async () => {
    const hub = newHub();
    await hub.startGuestSession();

    const result = await hub.publish(draft());

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("signed-out");
  });
});
