import { Icon, Input } from "@nodomics/ui";
import { useRef, useState } from "react";
import { useStore } from "zustand";
import { useAppStores, useDispatch, useFlowState } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { FlowLibraryDialog } from "./FlowLibraryDialog.tsx";
import type { SavedFlowStatus } from "./saved-flow-store.ts";
import "./saved-flows.css";

const STATUS_MESSAGES: Record<SavedFlowStatus, string> = {
  unsaved: MESSAGES.savedFlows.unsaved,
  saving: MESSAGES.savedFlows.saving,
  saved: MESSAGES.savedFlows.saved,
  unavailable: MESSAGES.savedFlows.unsaved,
};
export function SavedFlows() {
  const [isOpen, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { savedFlowStore } = useAppStores();
  const name = useFlowState((state) => state.flow.name);
  const dispatch = useDispatch();
  const status = useStore(savedFlowStore, (state) => state.status);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <>
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
      <button
        ref={trigger}
        type="button"
        className="nd-btn nd-btn-ghost nd-btn-sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="folder-open" />
        {MESSAGES.savedFlows.title}
      </button>
      {isOpen && <FlowLibraryDialog onClose={close} />}
    </>
  );
}
