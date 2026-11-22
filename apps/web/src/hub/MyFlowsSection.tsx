import { Button, Input } from "@nodomics/ui";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { useAppStores } from "../app-context.ts";
import { downloadFlow } from "../flow/download-flow.ts";
import type { FlowLibrary, SavedFlow } from "../library/flow-library.ts";
import { publicationStatusOf, type PublicationStatus } from "../library/publication-status.ts";
import { EmptyPanel } from "./EmptyPanel.tsx";
import { DeleteAction } from "../library/DeleteAction.tsx";
import { MESSAGES } from "../messages.ts";
import type { EditorOpening } from "../routing/routes.ts";
import "../library/saved-flows.css";

type OpenEditor = (opening: EditorOpening) => void;

/** The account's flows in the hub (ADR 0024): from here one enters the editor. */
export function MyFlowsSection({ onOpenEditor }: { readonly onOpenEditor: OpenEditor }) {
  const { savedFlowStore } = useAppStores();
  const flows = useStore(savedFlowStore, (state) => state.flows);
  // Flows change in the editor, which runs in another page load.
  useEffect(() => {
    void savedFlowStore.getState().refresh();
  }, [savedFlowStore]);
  return (
    <section className="web-hub-section" aria-label={MESSAGES.hub.views.flows}>
      {flows.length === 0 ? (
        <EmptyPanel icon="workflow" text={MESSAGES.savedFlows.empty}>
          <NewFlowButton onOpenEditor={onOpenEditor} />
        </EmptyPanel>
      ) : (
        <>
          <div className="web-hub-section-head">
            <NewFlowButton onOpenEditor={onOpenEditor} />
          </div>
          <div className="web-hub-grid">
            {flows.map((flow) => (
              <MyFlowCard key={flow.id} flow={flow} onOpenEditor={onOpenEditor} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function NewFlowButton({ onOpenEditor }: { readonly onOpenEditor: OpenEditor }) {
  return (
    <Button
      variant="primary"
      icon="plus"
      onClick={() => {
        onOpenEditor({ kind: "new" });
      }}
    >
      {MESSAGES.savedFlows.newFlow}
    </Button>
  );
}

type CardProps = { readonly flow: SavedFlow; readonly onOpenEditor: OpenEditor };

function MyFlowCard({ flow, onOpenEditor }: CardProps) {
  const { savedFlowStore } = useAppStores();
  const state = savedFlowStore.getState();
  return (
    <article className="web-saved-card" aria-label={flow.name}>
      <h3>{flow.name}</h3>
      <p>
        <span className="web-saved-status">{statusText(publicationStatusOf(flow))}</span>
        {" · "}
        <time dateTime={new Date(flow.updatedAt).toISOString()}>
          {new Date(flow.updatedAt).toLocaleDateString("es")}
        </time>
        {" · "}
        {MESSAGES.savedFlows.nodes(flow.flow.nodes.length)}
      </p>
      <div className="web-saved-main-actions">
        <Button
          variant="primary"
          onClick={() => {
            onOpenEditor({ kind: "flow", id: flow.id });
          }}
        >
          {MESSAGES.hub.enter}
        </Button>
        <Button
          variant="secondary"
          icon="copy"
          onClick={() => {
            void state.duplicate(flow.id);
          }}
        >
          {MESSAGES.hub.copy}
        </Button>
      </div>
      <FlowChores flow={flow} />
    </article>
  );
}

function FlowChores({ flow }: { readonly flow: SavedFlow }) {
  const { savedFlowStore } = useAppStores();
  const [isRenaming, setRenaming] = useState(false);
  const [name, setName] = useState(flow.name);
  const state = savedFlowStore.getState();
  return (
    <>
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
    </>
  );
}

function statusText(status: PublicationStatus): string {
  switch (status.kind) {
    case "unpublished":
      return MESSAGES.savedFlows.unpublished;
    case "published":
      return MESSAGES.savedFlows.publishedAt(status.version);
    case "changed":
      return MESSAGES.savedFlows.changed;
  }
}

async function exportSavedFlow(library: FlowLibrary, id: string) {
  const saved = await library.readFlow(id);
  // The file takes the name shown on the card.
  if (saved.value !== undefined) downloadFlow({ ...saved.value.flow, name: saved.value.name });
}
