import type { PublicationDetail } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { Button } from "@nodomics/ui";
import { useEffect } from "react";
import { useStore } from "zustand";
import { useAppStores } from "../app-context.ts";
import { flowFingerprint } from "../library/flow-fingerprint.ts";
import type { FlowLibrary, SavedFlow } from "../library/flow-library.ts";
import { MESSAGES } from "../messages.ts";
import type { EditorOpening } from "../routing/routes.ts";

type OwnFlowActionsProps = {
  readonly detail: PublicationDetail;
  readonly version: string;
  /** The shown version's flow, already without private params. */
  readonly flow: Flow;
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onOpenCopy: (flow: Flow) => void;
};

/** On my own publication, "Entrar" goes back to the flow it came from (ADR 0024). */
export function OwnFlowActions({ onOpenEditor, onOpenCopy, ...shown }: OwnFlowActionsProps) {
  const source = useSourceFlow(shown.detail.id);
  const { savedFlowStore } = useAppStores();
  const enter = async () => {
    const id = source?.id ?? (await saveAsSource(savedFlowStore.getState().library, shown));
    if (id !== undefined) onOpenEditor({ kind: "flow", id });
  };
  return (
    <div className="web-saved-main-actions">
      <Button variant="primary" onClick={() => void enter()}>
        {MESSAGES.hub.enter}
      </Button>
      <Button
        variant="secondary"
        icon="copy"
        onClick={() => {
          onOpenCopy(shown.flow);
        }}
      >
        {MESSAGES.hub.copy}
      </Button>
    </div>
  );
}

function useSourceFlow(publicationId: string): SavedFlow | undefined {
  const { savedFlowStore } = useAppStores();
  useEffect(() => {
    void savedFlowStore.getState().refresh();
  }, [savedFlowStore]);
  return useStore(savedFlowStore, ({ flows }) =>
    flows.find(({ published }) => published?.publicationId === publicationId),
  );
}

/** Publications from before ADR 0024 have no source flow: the shown version becomes it. */
async function saveAsSource(
  library: FlowLibrary,
  { detail, version, flow }: Omit<OwnFlowActionsProps, "onOpenEditor" | "onOpenCopy">,
): Promise<string | undefined> {
  const id = `flow_${crypto.randomUUID()}`;
  const saved = await library.saveFlow({
    id,
    name: detail.title,
    flow,
    files: {},
    updatedAt: Date.now(),
    published: {
      publicationId: detail.id,
      handle: detail.owner.handle,
      slug: detail.slug,
      version,
      fingerprint: flowFingerprint(flow),
      hasChanges: false,
    },
  });
  return saved.issue === undefined ? id : undefined;
}
