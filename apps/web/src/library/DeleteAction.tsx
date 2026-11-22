import { Button } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";

/** Deleting asks for a second click, so a stray click never loses anything. */
export function DeleteAction({ onDelete }: { readonly onDelete: () => Promise<void> }) {
  const [isConfirming, setConfirming] = useState(false);
  if (!isConfirming)
    return (
      <Button
        size="sm"
        onClick={() => {
          setConfirming(true);
        }}
      >
        {MESSAGES.savedFlows.remove}
      </Button>
    );
  return (
    <>
      <Button
        size="sm"
        variant="danger"
        onClick={() => {
          void onDelete();
        }}
      >
        {MESSAGES.savedFlows.confirm}
      </Button>
      <Button
        size="sm"
        onClick={() => {
          setConfirming(false);
        }}
      >
        {MESSAGES.savedFlows.cancel}
      </Button>
    </>
  );
}
