import { useEngineSelection } from "../engine/use-engine-selection.ts";
import { LocalAddressForm } from "./LocalAddressForm.tsx";
import { EngineBadge, Select, StatusIndicator } from "@nodomics/ui";
import { useEngineState } from "../app-context.ts";
import type { EngineEntry } from "../engine/engine-entry.ts";
import type { Connection } from "../engine/engine-state.ts";
import { MESSAGES } from "../messages.ts";

export type EngineSelectorProps = {
  readonly engines: ReadonlyArray<EngineEntry>;
  readonly engine: EngineEntry;
  readonly onEngineChange: (engine: EngineEntry) => void;
};

/** Picks the engine; changing it reconnects and resends the current flow. */
export function EngineSelector({ engines, engine, onEngineChange }: EngineSelectorProps) {
  const connection = useEngineState((state) => state.connection);
  const { pending, pick, connect, address } = useEngineSelection(
    engine,
    connection,
    onEngineChange,
  );
  const shown = pending ?? engine;
  return (
    <div className="web-toolbar-group">
      <div className="web-engine">
        <EngineBadge engine={shown.badge} compact />
        <Select
          label={MESSAGES.engines.selector}
          options={engines.map(({ id, label }) => ({ value: id, label }))}
          value={pending?.id ?? engine.id}
          onChange={(id) => {
            const picked = engines.find((candidate) => candidate.id === id);
            if (picked !== undefined) pick(picked);
          }}
        />
      </div>
      {pending === undefined ? (
        <ConnectionStatus connection={connection} />
      ) : (
        <LocalAddressForm key={pending.id} initialAddress={address} onConnect={connect} />
      )}
    </div>
  );
}

function ConnectionStatus({ connection }: { readonly connection: Connection }) {
  switch (connection.status) {
    case "connected":
      return null;
    case "failed":
      return (
        <StatusIndicator state="error" label={MESSAGES.connection.failures[connection.reason]} />
      );
    case "connecting":
    case "idle":
      return <StatusIndicator state="running" label={MESSAGES.connection.connecting} />;
  }
}
