import { Button } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";

type ConfirmActionProps = {
  readonly label: string;
  readonly isDisabled: boolean;
  readonly confirmation: { readonly question: string; readonly label: string };
  readonly onConfirm: () => void;
};

/** An action with consequences outside the editor asks for confirmation in the page first. */
export function ConfirmAction({ label, isDisabled, confirmation, onConfirm }: ConfirmActionProps) {
  const [isConfirming, setConfirming] = useState(false);
  if (!isConfirming)
    return (
      <Button
        size="sm"
        disabled={isDisabled}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {label}
      </Button>
    );
  return (
    <div className="web-deploy-confirm" role="group" aria-label={label}>
      <p className="web-caption">{confirmation.question}</p>
      <div className="web-deploy-actions">
        <Button
          size="sm"
          variant="danger"
          disabled={isDisabled}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          {confirmation.label}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setConfirming(false);
          }}
        >
          {MESSAGES.deploy.cancel}
        </Button>
      </div>
    </div>
  );
}
