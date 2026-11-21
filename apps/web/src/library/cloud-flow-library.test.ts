import type { FlowStore, StoredFlow } from "@nodomics/hub";
import { ok } from "@nodomics/protocol";
import { describe, expect, it, vi } from "vitest";
import {
  createFlowsHub,
  failingFlows,
  recordingFlows,
  savedFlowOf,
  signedInHub,
} from "./cloud-flow-fixtures.ts";
import { createCloudFlowLibrary } from "./cloud-flow-library.ts";
import type { FlowLibrary } from "./flow-library.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";

const cloudLibrary = (flows: FlowStore, local: FlowLibrary = createMemoryFlowLibrary()) =>
  createCloudFlowLibrary({ flows, local });

const rowOf = (document: unknown, overrides: Partial<StoredFlow> = {}): StoredFlow => ({
  id: "row",
  ownerId: "u-ana",
  visibility: "private",
  document,
  updatedAt: "2026-11-21T10:00:00Z",
  ...overrides,
});

/** A flow store that lists and reads back exactly the given rows. */
function flowsWithRows(rows: ReadonlyArray<StoredFlow>): FlowStore {
  return {
    ...recordingFlows().flows,
    listOwnFlows: () => Promise.resolve(ok(rows)),
    readFlow: (id) => Promise.resolve(ok(rows.find((row) => row.id === id))),
  };
}

/** A local library whose flow methods fail the test if anyone calls them. */
function localWithForbiddenFlows() {
  const local = createMemoryFlowLibrary();
  const forbidden = {
    listFlows: vi.fn<FlowLibrary["listFlows"]>(() => local.listFlows()),
    readFlow: vi.fn<FlowLibrary["readFlow"]>((id) => local.readFlow(id)),
    saveFlow: vi.fn<FlowLibrary["saveFlow"]>((flow) => local.saveFlow(flow)),
    deleteFlow: vi.fn<FlowLibrary["deleteFlow"]>((id) => local.deleteFlow(id)),
  };
  return { local: { ...local, ...forbidden }, forbidden };
}

describe("createCloudFlowLibrary listFlows", () => {
  it("returns an empty list with the signed-out issue when there is no session", async () => {
    const library = cloudLibrary(createFlowsHub());

    const listed = await library.listFlows();

    expect(listed).toEqual({ value: [], issue: "signed-out" });
  });

  it("returns an empty list with the unavailable issue when the hub fails", async () => {
    const library = cloudLibrary(failingFlows("unavailable"));

    const listed = await library.listFlows();

    expect(listed).toEqual({ value: [], issue: "unavailable" });
  });

  it("lists the account's saved flows with their visibility", async () => {
    const library = cloudLibrary(await signedInHub());
    await library.saveFlow(savedFlowOf("first"));
    await library.saveFlow(savedFlowOf("second", { visibility: "public" }));

    const listed = await library.listFlows();

    expect(listed).toEqual({
      value: [
        { ...savedFlowOf("second"), visibility: "public" },
        { ...savedFlowOf("first"), visibility: "private" },
      ],
    });
  });

  it("keeps the hub's order instead of sorting by the flow's own time", async () => {
    const library = cloudLibrary(
      flowsWithRows([
        rowOf(savedFlowOf("older-document", { updatedAt: 1 }), { id: "older-document" }),
        rowOf(savedFlowOf("newer-document", { updatedAt: 2 }), { id: "newer-document" }),
      ]),
    );

    const listed = await library.listFlows();

    expect(listed.value.map(({ id }) => id)).toEqual(["older-document", "newer-document"]);
  });

  it("drops rows whose document is not a saved flow and reports them as invalid", async () => {
    const library = cloudLibrary(
      flowsWithRows([
        rowOf({ id: "bad", flow: {} }, { id: "bad" }),
        rowOf(savedFlowOf("good"), { id: "good", visibility: "public" }),
      ]),
    );

    const listed = await library.listFlows();

    expect(listed).toEqual({
      value: [{ ...savedFlowOf("good"), visibility: "public" }],
      issue: "invalid",
    });
  });

  it("does not show flows kept in the local library", async () => {
    const local = createMemoryFlowLibrary();
    await local.saveFlow(savedFlowOf("local-only"));
    const library = cloudLibrary(await signedInHub(), local);

    const listed = await library.listFlows();

    expect(listed).toEqual({ value: [] });
  });
});

describe("createCloudFlowLibrary readFlow", () => {
  it("reads back a saved flow equal to what was saved, visibility included", async () => {
    const library = cloudLibrary(await signedInHub());
    const saved = savedFlowOf("one", { visibility: "public", files: { source: "csv" } });
    await library.saveFlow(saved);

    const read = await library.readFlow("one");

    expect(read).toEqual({ value: saved });
  });

  it("reads a flow saved without visibility as private", async () => {
    const library = cloudLibrary(await signedInHub());
    await library.saveFlow(savedFlowOf("one"));

    const read = await library.readFlow("one");

    expect(read.value?.visibility).toBe("private");
  });

  it("returns undefined for an unknown flow", async () => {
    const library = cloudLibrary(await signedInHub());

    const read = await library.readFlow("missing");

    expect(read).toEqual({ value: undefined });
  });

  it("returns undefined with the invalid issue when the document is not a saved flow", async () => {
    const library = cloudLibrary(flowsWithRows([rowOf({ id: "bad", flow: {} }, { id: "bad" })]));

    const read = await library.readFlow("bad");

    expect(read).toEqual({ value: undefined, issue: "invalid" });
  });

  it("returns undefined with the signed-out issue when the hub answers signed-out", async () => {
    const library = cloudLibrary(failingFlows("signed-out"));

    const read = await library.readFlow("one");

    expect(read).toEqual({ value: undefined, issue: "signed-out" });
  });

  it("returns undefined with the unavailable issue when the hub fails", async () => {
    const library = cloudLibrary(failingFlows("unavailable"));

    const read = await library.readFlow("one");

    expect(read).toEqual({ value: undefined, issue: "unavailable" });
  });
});

describe("createCloudFlowLibrary saveFlow", () => {
  it("sends the saved flow as the document, without its visibility", async () => {
    const { flows, drafts } = recordingFlows();
    const library = cloudLibrary(flows);

    await library.saveFlow(savedFlowOf("one", { visibility: "public" }));

    expect(drafts).toEqual([{ id: "one", visibility: "public", document: savedFlowOf("one") }]);
  });

  it("saves a flow without visibility as private", async () => {
    const { flows, drafts } = recordingFlows();
    const library = cloudLibrary(flows);

    await library.saveFlow(savedFlowOf("one"));

    expect(drafts.map(({ visibility }) => visibility)).toEqual(["private"]);
  });

  it("reports signed-out when there is no session", async () => {
    const library = cloudLibrary(createFlowsHub());

    const saved = await library.saveFlow(savedFlowOf("one"));

    expect(saved).toEqual({ value: undefined, issue: "signed-out" });
  });

  it("reports unavailable when the hub fails", async () => {
    const library = cloudLibrary(failingFlows("unavailable"));

    const saved = await library.saveFlow(savedFlowOf("one"));

    expect(saved).toEqual({ value: undefined, issue: "unavailable" });
  });

  it("overwrites the flow on a later save with the same id", async () => {
    const library = cloudLibrary(await signedInHub());
    await library.saveFlow(savedFlowOf("one", { name: "Antes" }));

    await library.saveFlow(savedFlowOf("one", { name: "Después" }));

    expect((await library.listFlows()).value.map(({ name }) => name)).toEqual(["Después"]);
  });
});

describe("createCloudFlowLibrary deleteFlow", () => {
  it("removes the flow from the account", async () => {
    const library = cloudLibrary(await signedInHub());
    await library.saveFlow(savedFlowOf("one"));

    await library.deleteFlow("one");

    expect(await library.readFlow("one")).toEqual({ value: undefined });
  });

  it("reports signed-out when the hub answers signed-out", async () => {
    const library = cloudLibrary(failingFlows("signed-out"));

    const deleted = await library.deleteFlow("one");

    expect(deleted).toEqual({ value: undefined, issue: "signed-out" });
  });

  it("reports unavailable when the hub fails", async () => {
    const library = cloudLibrary(failingFlows("unavailable"));

    const deleted = await library.deleteFlow("one");

    expect(deleted).toEqual({ value: undefined, issue: "unavailable" });
  });
});

describe("createCloudFlowLibrary local data", () => {
  it("keeps files in the local library", async () => {
    const local = createMemoryFlowLibrary();
    const library = cloudLibrary(createFlowsHub(), local);
    const file = { key: "csv", name: "ventas.csv", size: 2, savedAt: 1 };

    await library.saveFile(file);

    expect((await local.readFile("csv")).value).toEqual(file);
  });

  it("lists, reads and deletes the local library's files", async () => {
    const local = createMemoryFlowLibrary();
    await local.saveFile({ key: "csv", name: "ventas.csv", size: 2, savedAt: 1 });
    await local.saveFile({ key: "old", name: "viejo.csv", size: 1, savedAt: 1 });
    const library = cloudLibrary(createFlowsHub(), local);

    await library.deleteFile("old");

    expect({
      listed: (await library.listFiles()).value.map(({ key }) => key),
      read: (await library.readFile("csv")).value?.name,
    }).toEqual({ listed: ["csv"], read: "ventas.csv" });
  });

  it("keeps secrets in the local library", async () => {
    const local = createMemoryFlowLibrary();
    const library = cloudLibrary(await signedInHub(), local);

    await library.saveSecret({ name: "API", value: "s3cr3t" });

    expect((await local.readSecrets()).value).toEqual([{ name: "API", value: "s3cr3t" }]);
  });

  it("lists, reads and deletes the local library's secrets", async () => {
    const local = createMemoryFlowLibrary();
    await local.saveSecret({ name: "API", value: "one" });
    await local.saveSecret({ name: "OLD", value: "two" });
    const library = cloudLibrary(createFlowsHub(), local);

    await library.deleteSecret("OLD");

    expect({
      names: (await library.listSecretNames()).value,
      secrets: (await library.readSecrets()).value,
    }).toEqual({ names: ["API"], secrets: [{ name: "API", value: "one" }] });
  });

  it("never touches the local library's flows", async () => {
    const { local, forbidden } = localWithForbiddenFlows();
    const library = cloudLibrary(await signedInHub(), local);

    await library.saveFlow(savedFlowOf("one"));
    await library.listFlows();
    await library.readFlow("one");
    await library.deleteFlow("one");

    expect(Object.values(forbidden).map((method) => method.mock.calls.length)).toEqual([
      0, 0, 0, 0,
    ]);
  });
});
