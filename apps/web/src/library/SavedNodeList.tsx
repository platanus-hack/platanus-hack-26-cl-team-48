import type { NodeManifest, PortSpec } from "@nodomics/protocol";
import { Button, dataTypeLabel } from "@nodomics/ui";
import { useStore } from "zustand";
import { useAppStores, useCatalog } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { nodeFromFlow } from "./flow-node.ts";
import type { SavedFlow } from "./flow-library.ts";

export function SavedNodeList() {
  const flows = useStore(useAppStores().savedFlowStore, ({ flows }) => flows);
  return (
    <div className="web-saved-list">
      {flows
        .filter((saved) => saved.flow.nodes.some((node) => node.type === "flow.node"))
        .map((saved) => (
          <SavedNode key={saved.id} saved={saved} />
        ))}
      <LegacyNodes />
    </div>
  );
}

function LegacyNodes() {
  const legacy = useStore(useAppStores().personalLibraryStore, ({ nodes }) => nodes);
  return legacy.length === 0 ? null : (
    <section>
      <h3>{MESSAGES.flowNodes.legacy}</h3>
      {legacy.map((manifest) => (
        <article key={manifest.id}>
          <h4>{manifest.name}</h4>
          <NodeDescription manifest={manifest} />
        </article>
      ))}
    </section>
  );
}

function SavedNode({ saved }: { readonly saved: SavedFlow }) {
  const result = nodeFromFlow(
    { id: saved.id, flow: saved.flow, version: saved.node?.version ?? "0.1.0" },
    [...useCatalog(), ...(saved.flow.customNodes ?? [])],
  );
  return (
    <article className="web-saved-card" aria-label={saved.name}>
      <h3>{result.ok ? result.value.name : saved.name}</h3>
      {result.ok ? (
        <NodeDescription manifest={result.value} />
      ) : (
        <p>{MESSAGES.flowNodes.issues[result.error]}</p>
      )}
      <OpenNodeFlow saved={saved} />
    </article>
  );
}

function OpenNodeFlow({ saved }: { readonly saved: SavedFlow }) {
  const { savedFlowStore } = useAppStores();
  return (
    <Button
      onClick={() => {
        void savedFlowStore.getState().openFlow(saved.id);
      }}
    >
      {MESSAGES.flowNodes.open}
    </Button>
  );
}

function NodeDescription({ manifest }: { readonly manifest: NodeManifest }) {
  return (
    <>
      <p>{manifest.version}</p>
      <p>{manifest.description}</p>
      <p>
        {MESSAGES.params.input}: {describePorts(manifest.inputs)}
      </p>
      <p>
        {MESSAGES.params.output}: {describePorts(manifest.outputs)}
      </p>
    </>
  );
}

const describePorts = (ports: ReadonlyArray<PortSpec>) =>
  ports.map((port) => `${port.name ?? port.id} (${dataTypeLabel(port.type)})`).join(", ");
