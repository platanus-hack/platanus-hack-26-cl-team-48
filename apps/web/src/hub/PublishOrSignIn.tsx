import { useStore } from "zustand";
import { useAppStores, useCatalog } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { useHubProfile } from "./hub-context.ts";
import { PublishDialog, type PublishSource } from "./PublishDialog.tsx";
import { SignInDialog } from "./SignInDialog.tsx";
import { useRecordSnapshot } from "./use-record-snapshot.ts";

/** Publishing needs an account: signed out, the same action asks to sign in first. */
export function PublishOrSignIn({ onClose }: { readonly onClose: () => void }) {
  const profile = useHubProfile();
  const source = usePublishSource();
  const record = useRecordSnapshot();
  if (profile === undefined) return <SignInDialog onClose={onClose} />;
  return <PublishDialog source={source} record={record} onClose={onClose} />;
}

function usePublishSource(): PublishSource {
  const { flowStore, savedFlowStore } = useAppStores();
  const catalog = useCatalog();
  const flow = useStore(flowStore, ({ state }) => state.flow);
  const saved = useStore(savedFlowStore, ({ flows, currentId }) =>
    flows.find(({ id }) => id === currentId),
  );
  return {
    flowId: saved?.id ?? "unsaved",
    title: saved?.name ?? MESSAGES.app.untitledFlow,
    flow,
    catalog,
  };
}
