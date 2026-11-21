import { useRef } from "react";
import { useAppStores } from "../app-context.ts";
import { useFlowFiles } from "../flow/use-flow-files.ts";
import { IconMenu } from "../layout/IconMenu.tsx";
import { MESSAGES } from "../messages.ts";

const FLOW_FILE_TYPES = ".json,application/json";

/** What is done to the open flow as a whole: start another, or bring it in and out as a file. */
export function FlowOptionsMenu() {
  const { savedFlowStore } = useAppStores();
  const { exportFlow, importFlow } = useFlowFiles();
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <IconMenu
        size="md"
        icon="chevron-down"
        label={MESSAGES.toolbar.flowOptions}
        items={[
          {
            label: MESSAGES.toolbar.newFlow,
            onSelect: () => void savedFlowStore.getState().newFlow(),
          },
          { label: MESSAGES.toolbar.importFile, onSelect: () => fileInput.current?.click() },
          { label: MESSAGES.toolbar.exportFile, onSelect: exportFlow },
        ]}
      />
      <input
        ref={fileInput}
        className="web-hidden-input"
        type="file"
        accept={FLOW_FILE_TYPES}
        aria-label={MESSAGES.toolbar.import}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void importFlow(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
