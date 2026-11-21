import { Input } from "@nodomics/ui";
import { useStore } from "zustand";
import { useAppStores, useDispatch, useFlowState } from "../app-context.ts";
import type { SavedFlowStatus } from "../library/saved-flow-store.ts";
import { MESSAGES } from "../messages.ts";

const STATUS_MESSAGES: Record<SavedFlowStatus, string> = {
  unsaved: MESSAGES.savedFlows.unsaved,
  saving: MESSAGES.savedFlows.saving,
  saved: MESSAGES.savedFlows.saved,
  unavailable: MESSAGES.savedFlows.unsaved,
  "signed-out": MESSAGES.savedFlows.signedOut,
};

/** The open flow's name, renamed in place, and whether the account has saved it. */
export function FlowName() {
  const { savedFlowStore } = useAppStores();
  const name = useFlowState((state) => state.flow.name);
  const dispatch = useDispatch();
  const status = useStore(savedFlowStore, (state) => state.status);
  return (
    <div className="web-flow-name">
      <Input
        size="sm"
        label={MESSAGES.savedFlows.name}
        value={name ?? ""}
        placeholder={MESSAGES.app.untitledFlow}
        onChange={(value) => {
          dispatch({ type: "flow.rename", name: value || MESSAGES.app.untitledFlow });
        }}
      />
      <span className="web-caption" role="status">
        {STATUS_MESSAGES[status]}
      </span>
    </div>
  );
}
