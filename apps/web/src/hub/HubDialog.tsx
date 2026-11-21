import { Button } from "@nodomics/ui";
import { useEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { MESSAGES } from "../messages.ts";

type HubDialogProps = {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
};

/** A modal of the hub: the native dialog, titled, closed with its button or Escape. */
export function HubDialog({ title, onClose, children }: HubDialogProps) {
  const dialog = useModal();
  const close = (event: SyntheticEvent) => {
    event.preventDefault();
    onClose();
  };
  return createPortal(
    <dialog ref={dialog} className="web-hub-dialog" aria-label={title} onCancel={close}>
      <header className="web-hub-dialog-heading">
        <h2>{title}</h2>
        <Button icon="x" label={MESSAGES.account.close} onClick={onClose} />
      </header>
      {children}
    </dialog>,
    document.body,
  );
}

function useModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return dialog;
}
