import { Button, Icon, ICON_SIZE } from "@nodomics/ui";
import { useState } from "react";
import { useStore } from "zustand";
import { useAppStores, useCatalog } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { AccountButton } from "./AccountButton.tsx";
import { useHubProfile } from "./hub-context.ts";
import { PublishDialog, type PublishSource } from "./PublishDialog.tsx";
import { SignInDialog } from "./SignInDialog.tsx";
import { useRecordSnapshot } from "./use-record-snapshot.ts";

/** The editor's way into the hub: browse it, publish the open flow, and the account. */
export function HubToolbarActions() {
  return (
    <>
      <RouteLink route={{ page: "hub" }} className="nd-btn nd-btn-secondary nd-btn-md">
        <Icon name="globe" size={ICON_SIZE.sm} />
        {MESSAGES.hub.open}
      </RouteLink>
      <PublishButton />
      <AccountButton />
    </>
  );
}

function PublishButton() {
  const [isOpen, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <>
      <Button
        icon="upload"
        onClick={() => {
          setOpen(true);
        }}
      >
        {MESSAGES.publish.action}
      </Button>
      {isOpen && <PublishOrSignIn onClose={close} />}
    </>
  );
}

function PublishOrSignIn({ onClose }: { readonly onClose: () => void }) {
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
