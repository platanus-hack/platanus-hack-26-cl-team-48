import { SNAPSHOT_FORMAT, type Snapshot } from "@nodomics/hub";
import { useAppStores } from "../app-context.ts";
import { useEngineConnection } from "../engine/engine-connection.ts";
import { createReplaySession, recordSnapshot } from "./snapshot-replay.ts";

/** Records the open flow's snapshot; without an engine there is no state to record. */
export function useRecordSnapshot(): (includeState: boolean) => Promise<Snapshot> {
  const { flowStore, engineStore } = useAppStores();
  const connection = useEngineConnection();
  return (includeState) =>
    recordSnapshot({
      flow: flowStore.getState().state.flow,
      engine: engineStore.getState().state,
      session: connection?.session ?? createReplaySession({ format: SNAPSHOT_FORMAT, catalog: [] }),
      includeState: includeState && connection !== undefined,
    });
}
