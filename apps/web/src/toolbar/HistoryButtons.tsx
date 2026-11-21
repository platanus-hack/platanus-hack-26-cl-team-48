import { Button } from "@nodomics/ui";
import { useDispatch, useFlowState } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";

export function HistoryButtons() {
  const dispatch = useDispatch();
  const canUndo = useFlowState((state) => state.undo.length > 0);
  const canRedo = useFlowState((state) => state.redo.length > 0);
  return (
    <div className="web-toolbar-group">
      <Button
        variant="ghost"
        icon="undo-2"
        label={MESSAGES.toolbar.undo}
        disabled={!canUndo}
        onClick={() => {
          dispatch({ type: "history.undo" });
        }}
      ></Button>
      <Button
        variant="ghost"
        icon="redo-2"
        label={MESSAGES.toolbar.redo}
        disabled={!canRedo}
        onClick={() => {
          dispatch({ type: "history.redo" });
        }}
      ></Button>
    </div>
  );
}
