import { useEffect, useRef } from "react";
import { useEngineConnection } from "./engine-connection.ts";
import { useRunFlow } from "./use-engine-actions.ts";

/** Runs the flow once, the first time an engine is connected. */
export function useRunOnConnect(isEnabled: boolean): void {
  const connection = useEngineConnection();
  const run = useRunFlow();
  const hasRun = useRef(false);
  useEffect(() => {
    if (!isEnabled || hasRun.current || connection === undefined || run === undefined) return;
    hasRun.current = true;
    void run();
  }, [isEnabled, connection, run]);
}
