import { Button } from "@nodomics/ui";
import { useEngineState } from "../app-context.ts";
import { useRunFlow } from "../engine/use-engine-actions.ts";
import { MESSAGES } from "../messages.ts";

export function RunButton() {
  const run = useRunFlow();
  const isRunning = useEngineState((state) => state.run?.status === "running");
  return (
    <Button
      variant="primary"
      icon="play"
      disabled={run === undefined}
      loading={isRunning}
      onClick={() => void run?.()}
    >
      {isRunning ? MESSAGES.toolbar.running : MESSAGES.toolbar.run}
    </Button>
  );
}
