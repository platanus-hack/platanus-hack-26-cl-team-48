import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainCard } from "../src/contracts/domain-card.ts";
import type { Proposal } from "../src/contracts/proposal.ts";
import { createFakeProposalStore } from "../src/proposals/fake-proposal-store.ts";
import { createSupabaseProposalStore } from "../src/proposals/supabase-proposal-store.ts";
import type { StoredProposal } from "../src/proposals/proposal-store-port.ts";

const SAMPLE_PROPOSAL: Proposal = {
  id: "prop-1",
  flowId: "flow-1",
  draftId: "draft-1",
  baseRevision: "rev-1",
  version: 1,
  status: "pending",
  changes: [
    {
      id: "ch-1",
      kind: "set_param",
      target: "win.hours",
      before: 4,
      after: 2,
      reason: "Ventana ajustada a 2 horas",
      dependsOn: [],
    },
  ],
};

const SAMPLE_CARDS: DomainCard[] = [
  {
    changeId: "ch-1",
    title: "Ventana",
    before: 4,
    after: 2,
    unit: "h",
    reason: "Ventana ajustada a 2 horas",
  },
];

const STORED: StoredProposal = {
  proposal: SAMPLE_PROPOSAL,
  cards: SAMPLE_CARDS,
  ownerId: "user-1",
};

describe("FakeProposalStore", () => {
  it("saves and retrieves a proposal for its owner", async () => {
    const store = createFakeProposalStore();

    const saveRes = await store.save(STORED);
    expect(saveRes.ok).toBe(true);

    const getRes = await store.get("prop-1", "user-1");
    expect(getRes.ok).toBe(true);
    if (!getRes.ok) return;
    expect(getRes.value.proposal.id).toBe("prop-1");
    expect(getRes.value.cards).toHaveLength(1);
  });

  it("fails to retrieve a proposal of another owner with NOT_FOUND", async () => {
    const store = createFakeProposalStore();
    await store.save(STORED);

    const getRes = await store.get("prop-1", "other-user");
    expect(getRes.ok).toBe(false);
    if (getRes.ok) return;
    expect(getRes.error.code).toBe("NOT_FOUND");
  });

  it("updates status when expectedVersion matches", async () => {
    const store = createFakeProposalStore();
    await store.save(STORED);

    const updateRes = await store.updateStatus({
      id: "prop-1",
      ownerId: "user-1",
      expectedVersion: 1,
      status: "accepted",
    });

    expect(updateRes.ok).toBe(true);

    const getRes = await store.get("prop-1", "user-1");
    expect(getRes.ok).toBe(true);
    if (!getRes.ok) return;
    expect(getRes.value.proposal.status).toBe("accepted");
    expect(getRes.value.proposal.version).toBe(2);
  });

  it("version conflict on stale update", async () => {
    const store = createFakeProposalStore();
    await store.save(STORED);

    const updateRes = await store.updateStatus({
      id: "prop-1",
      ownerId: "user-1",
      expectedVersion: 0,
      status: "rejected",
    });

    expect(updateRes.ok).toBe(false);
    if (updateRes.ok) return;
    expect(updateRes.error.code).toBe("VERSION_CONFLICT");
  });
});

describe("SupabaseProposalStore", () => {
  it("interacts with supabase client methods", async () => {
    let inserted: unknown = null;

    const mockSupabase = {
      from: () => ({
        insert: (row: unknown) => {
          inserted = row;
          return Promise.resolve({ error: null });
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "prop-1",
                    owner_id: "user-1",
                    flow_id: "flow-1",
                    draft_id: "draft-1",
                    base_revision: "rev-1",
                    version: 1,
                    status: "pending",
                    changes: SAMPLE_PROPOSAL.changes,
                    cards: SAMPLE_CARDS,
                  },
                  error: null,
                }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [{ id: "prop-1" }], error: null }),
              }),
            }),
          }),
        }),
      }),
    };

    const store = createSupabaseProposalStore(mockSupabase as unknown as SupabaseClient);

    const saveRes = await store.save(STORED);
    expect(saveRes.ok).toBe(true);
    expect(inserted).not.toBeNull();

    const getRes = await store.get("prop-1", "user-1");
    expect(getRes.ok).toBe(true);
    if (!getRes.ok) return;
    expect(getRes.value.proposal.id).toBe("prop-1");
  });
});
