import { Button, Input } from "@nodomics/ui";
import { useState } from "react";
import { useStore } from "zustand";
import { useAppStores } from "../app-context.ts";
import { downloadFlow } from "../flow/download-flow.ts";
import { MESSAGES } from "../messages.ts";
import type { FlowLibrary, SavedFlow } from "./flow-library.ts";

export function SavedFlowList({ onClose }: { readonly onClose: () => void }) {
  const { savedFlowStore } = useAppStores();
  const openNew = async () => {
    await savedFlowStore.getState().newFlow();
    onClose();
  };
  const flows = useStore(savedFlowStore, (state) => state.flows);
  return (
    <div className="web-saved-list">
      <Button
        icon="plus"
        onClick={() => {
          void openNew();
        }}
      >
        {MESSAGES.savedFlows.newFlow}
      </Button>
      {flows.length === 0 && <p>{MESSAGES.savedFlows.empty}</p>}
      {flows.map((flow) => (
        <SavedFlowCard key={flow.id} flow={flow} onClose={onClose} />
      ))}
    </div>
  );
}
function SavedFlowCard({
  flow,
  onClose,
}: {
  readonly flow: SavedFlow;
  readonly onClose: () => void;
}) {
  const { savedFlowStore } = useAppStores();
  const [isRenaming, setRenaming] = useState(false);
  const [name, setName] = useState(flow.name);
  const state = savedFlowStore.getState();
  const openSaved = async () => {
    await state.openFlow(flow.id);
    onClose();
  };
  return (
    <article className="web-saved-card" aria-label={flow.name}>
      <h3>{flow.name}</h3>
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
            void openSaved();
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
        <DeleteAction onDelete={() => state.remove(flow.id)} />
      </div>
    </article>
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
