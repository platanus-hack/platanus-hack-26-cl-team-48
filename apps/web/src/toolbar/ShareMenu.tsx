import { useRef, useState } from "react";
import { useFlowFiles } from "../flow/use-flow-files.ts";
import { PublishOrSignIn } from "../hub/PublishOrSignIn.tsx";
import { IconMenu } from "../layout/IconMenu.tsx";
import { MESSAGES } from "../messages.ts";

const FLOW_FILE_TYPES = ".json,application/json";

/** Every way the open flow leaves the editor: a link, the hub, or a file. */
export function ShareMenu() {
  const { exportFlow, importFlow, shareFlow } = useFlowFiles();
  const fileInput = useRef<HTMLInputElement>(null);
  const [isPublishing, setPublishing] = useState(false);
  return (
    <>
      <IconMenu
        hasText
        size="md"
        icon="upload"
        label={MESSAGES.toolbar.share}
        items={[
          { label: MESSAGES.toolbar.copyLink, onSelect: () => void shareFlow() },
          {
            label: MESSAGES.toolbar.publish,
            onSelect: () => {
              setPublishing(true);
            },
          },
          { label: MESSAGES.toolbar.exportFile, onSelect: exportFlow },
          { label: MESSAGES.toolbar.importFile, onSelect: () => fileInput.current?.click() },
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
      {isPublishing && (
        <PublishOrSignIn
          onClose={() => {
            setPublishing(false);
          }}
        />
      )}
    </>
  );
}
