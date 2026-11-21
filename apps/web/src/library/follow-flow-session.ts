import type { Hub } from "@nodomics/hub";
import type { AppStores } from "../app-stores.ts";

type FlowSessionDeps = {
  readonly hub: Pick<Hub, "onProfileChange">;
  readonly stores: AppStores;
  readonly saving: { readonly saveCurrent: () => Promise<void> };
  readonly initialProfileId: string | undefined;
};

/** Saved flows belong to the account (ADR 0023): follow it as it signs in, out or changes. */
export function followFlowSession({ hub, stores, saving, initialProfileId }: FlowSessionDeps) {
  let profileId = initialProfileId;
  return hub.onProfileChange((profile) => {
    if (profile?.id === profileId) return;
    profileId = profile?.id;
    if (profile === undefined) signOut(stores);
    else void signIn(stores, saving);
  });
}

/** A flow saved in the account leaves with it, so the next account to sign in cannot copy it. */
function signOut(stores: AppStores) {
  const saved = stores.savedFlowStore;
  const wasSaved = saved.getState().currentId !== undefined;
  saved.setState({ currentId: undefined, flows: [], status: "signed-out" });
  if (wasSaved) void saved.getState().newFlow();
}

async function signIn(stores: AppStores, saving: FlowSessionDeps["saving"]) {
  const saved = stores.savedFlowStore;
  saved.setState({ currentId: undefined });
  await saved.getState().refresh();
  const latest = saved.getState().flows[0];
  if (stores.flowStore.getState().state.flow.nodes.length > 0) await saving.saveCurrent();
  else if (latest !== undefined) await saved.getState().openFlow(latest.id);
}
