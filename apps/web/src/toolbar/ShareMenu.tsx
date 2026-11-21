import { useState } from "react";
import { useFlowFiles } from "../flow/use-flow-files.ts";
import { PublishOrSignIn } from "../hub/PublishOrSignIn.tsx";
import { IconMenu } from "../layout/IconMenu.tsx";
import { MESSAGES } from "../messages.ts";

/** The ways the open flow reaches other people: a link, or the hub. */
export function ShareMenu() {
  const { shareFlow } = useFlowFiles();
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
        ]}
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
