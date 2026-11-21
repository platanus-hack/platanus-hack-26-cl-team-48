import { Badge, Button, Input } from "@nodomics/ui";
import { useState } from "react";
import { useStore } from "zustand";
import { useAppStores } from "../app-context.ts";
import { downloadFlow } from "../flow/download-flow.ts";
import { SignInDialog } from "../hub/SignInDialog.tsx";
import { MESSAGES } from "../messages.ts";
import type { FlowLibrary, SavedFlow } from "./flow-library.ts";

export function SavedFlowList() {
  const { savedFlowStore } = useAppStores();
  const flows = useStore(savedFlowStore, (state) => state.flows);
  const isSignedOut = useStore(savedFlowStore, (state) => state.status === "signed-out");
  return (
    <div className="web-saved-list">
      <Button
        icon="plus"
        onClick={() => {
          void savedFlowStore.getState().newFlow();
        }}
      >
        {MESSAGES.savedFlows.newFlow}
      </Button>
      {isSignedOut ? <SignInToSave /> : flows.length === 0 && <p>{MESSAGES.savedFlows.empty}</p>}
      {flows.map((flow) => (
        <SavedFlowCard key={flow.id} flow={flow} />
      ))}
    </div>
  );
}
function SignInToSave() {
  const [isSigningIn, setSigningIn] = useState(false);
  return (
    <>
      <p>{MESSAGES.savedFlows.signInToSave}</p>
      <Button
        variant="primary"
        onClick={() => {
          setSigningIn(true);
        }}
      >
        {MESSAGES.account.signIn}
      </Button>
      {isSigningIn && (
        <SignInDialog
          onClose={() => {
            setSigningIn(false);
          }}
        />
      )}
    </>
  );
}

function SavedFlowCard({ flow }: { readonly flow: SavedFlow }) {
  const { savedFlowStore } = useAppStores();
  const [isRenaming, setRenaming] = useState(false);
  const [name, setName] = useState(flow.name);
  const state = savedFlowStore.getState();
  return (
    <article className="web-saved-card" aria-label={flow.name}>
      <h3>{flow.name}</h3>
      <VisibilityBadge flow={flow} />
      <p>
        <time dateTime={new Date(flow.updatedAt).toISOString()}>
          {new Date(flow.updatedAt).toLocaleDateString("es")}
        </time>{" "}
        · {MESSAGES.savedFlows.nodes(flow.flow.nodes.length)}
      </p>
      {isRenaming && (
        <div className="web-saved-actions">
          <Input label={MESSAGES.savedFlows.name} value={name} onChange={setName} />
          <Button
            onClick={() => {
              void state.rename(flow.id, name.trim() || MESSAGES.app.untitledFlow);
              setRenaming(false);
            }}
          >
            {MESSAGES.savedFlows.save}
          </Button>
        </div>
      )}
      <div className="web-saved-actions">
        <Button
          size="sm"
          onClick={() => {
            void state.openFlow(flow.id);
          }}
        >
          {MESSAGES.savedFlows.open}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            void state.duplicate(flow.id);
          }}
        >
          {MESSAGES.savedFlows.duplicate}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setRenaming(true);
          }}
        >
          {MESSAGES.savedFlows.rename}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            void exportSavedFlow(state.library, flow.id);
          }}
        >
          {MESSAGES.savedFlows.export}
        </Button>
        <VisibilityAction flow={flow} />
        <DeleteAction onDelete={() => state.remove(flow.id)} />
      </div>
    </article>
  );
}
const isPublic = (flow: SavedFlow) => flow.visibility === "public";

function VisibilityBadge({ flow }: { readonly flow: SavedFlow }) {
  return isPublic(flow) ? (
    <Badge tone="accent" icon="globe">
      {MESSAGES.savedFlows.public}
    </Badge>
  ) : (
    <Badge icon="lock">{MESSAGES.savedFlows.private}</Badge>
  );
}

function VisibilityAction({ flow }: { readonly flow: SavedFlow }) {
  const { savedFlowStore } = useAppStores();
  return (
    <Button
      size="sm"
      onClick={() => {
        void savedFlowStore
          .getState()
          .setVisibility(flow.id, isPublic(flow) ? "private" : "public");
      }}
    >
      {isPublic(flow) ? MESSAGES.savedFlows.makePrivate : MESSAGES.savedFlows.makePublic}
    </Button>
  );
}

async function exportSavedFlow(library: FlowLibrary, id: string) {
  const saved = await library.readFlow(id);
  if (saved.value !== undefined) downloadFlow(saved.value.flow);
}
export function DeleteAction({ onDelete }: { readonly onDelete: () => Promise<void> }) {
  const [isConfirming, setConfirming] = useState(false);
  if (!isConfirming)
    return (
      <Button
        size="sm"
        onClick={() => {
          setConfirming(true);
        }}
      >
        {MESSAGES.savedFlows.remove}
      </Button>
    );
  return (
    <>
      <Button
        size="sm"
        variant="danger"
        onClick={() => {
          void onDelete();
        }}
      >
        {MESSAGES.savedFlows.confirm}
      </Button>
      <Button
        size="sm"
        onClick={() => {
          setConfirming(false);
        }}
      >
        {MESSAGES.savedFlows.cancel}
      </Button>
    </>
  );
}
