import { Button } from "@nodomics/ui";
import { useRef } from "react";
import { useFlowFiles } from "../flow/use-flow-files.ts";
import { MESSAGES } from "../messages.ts";

const FLOW_FILE_TYPES = ".json,application/json";

export function FlowFileActions() {
  const { exportFlow, importFlow, shareFlow } = useFlowFiles();
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="web-toolbar-group">
      <Button variant="ghost" onClick={() => void shareFlow()}>
        {MESSAGES.toolbar.share}
      </Button>
      <Button
        variant="ghost"
        icon="download"
        label={MESSAGES.toolbar.export}
        onClick={exportFlow}
      ></Button>
      <Button
        variant="ghost"
        icon="upload"
        label={MESSAGES.toolbar.import}
        onClick={() => fileInput.current?.click()}
      ></Button>
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
    </div>
  );
}
