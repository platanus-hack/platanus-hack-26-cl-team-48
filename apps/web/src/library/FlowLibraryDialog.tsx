import { Button } from "@nodomics/ui";
import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { navigateTabs } from "../preview/tab-navigation.ts";
import { SavedNodeList } from "./SavedNodeList.tsx";
import { SavedFlowList } from "./SavedFlowList.tsx";
import { Credentials } from "./Credentials.tsx";
import { StoredFileList } from "./StoredFileList.tsx";

type Tab = {
  readonly id: string;
  readonly label: string;
  readonly Content: ComponentType<{ readonly onClose: () => void }>;
};
const TABS: ReadonlyArray<Tab> = [
  { id: "flows", label: MESSAGES.savedFlows.flows, Content: SavedFlowList },
  { id: "nodes", label: MESSAGES.flowNodes.tab, Content: SavedNodeList },
  { id: "data", label: MESSAGES.savedFlows.data, Content: StoredFileList },
  { id: "secrets", label: MESSAGES.secrets.title, Content: Credentials },
];
type CloseProps = { readonly onClose: () => void };
type TabsProps = CloseProps & {
  readonly id: string;
  readonly selected: number;
  readonly select: (index: number) => void;
};

export function FlowLibraryDialog({ onClose }: CloseProps) {
  const dialog = useLibraryDialog();
  const [selected, select] = useState(0);
  const id = useId();
  return createPortal(
    <dialog
      ref={dialog}
      className="web-flow-library"
      aria-label={MESSAGES.savedFlows.title}
      onCancel={closeDialog(onClose)}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeDialog(onClose)(event);
      }}
    >
      <LibraryHeading onClose={onClose} />
      <LibraryTabs id={id} selected={selected} select={select} onClose={onClose} />
    </dialog>,
    document.body,
  );
}

function useLibraryDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { savedFlowStore } = useAppStores();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    void savedFlowStore.getState().refresh();
    return () => {
      element?.close();
    };
  }, [savedFlowStore]);
  return dialog;
}

function LibraryHeading({ onClose }: CloseProps) {
  return (
    <header className="web-library-heading">
      <h2>{MESSAGES.savedFlows.title}</h2>
      <Button icon="x" label={MESSAGES.savedFlows.close} onClick={onClose} />
    </header>
  );
}

function LibraryTabs(props: TabsProps) {
  return (
    <>
      <div role="tablist" aria-label={MESSAGES.savedFlows.title} className="web-seg web-seg-md">
        {TABS.map((tab, index) => (
          <LibraryTab key={tab.id} {...props} tab={tab} index={index} />
        ))}
      </div>
      {TABS.map((tab, index) => (
        <LibraryPanel key={tab.id} {...props} tab={tab} index={index} />
      ))}
    </>
  );
}

type TabProps = TabsProps & { readonly tab: Tab; readonly index: number };
function LibraryPanel({ id, selected, tab, index, onClose }: TabProps) {
  return (
    <div
      id={`${id}-${tab.id}-panel`}
      role="tabpanel"
      aria-labelledby={`${id}-${tab.id}`}
      hidden={selected !== index}
    >
      {selected === index && <tab.Content onClose={onClose} />}
    </div>
  );
}

function LibraryTab(props: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`${props.id}-${props.tab.id}`}
      aria-controls={`${props.id}-${props.tab.id}-panel`}
      aria-selected={props.selected === props.index}
      tabIndex={props.selected === props.index ? 0 : -1}
      className="web-seg-button"
      {...tabHandlers(props)}
    >
      {props.tab.label}
    </button>
  );
}

function tabHandlers({ select, selected, index }: TabProps) {
  return {
    onClick: () => {
      select(index);
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      moveTab(event, selected, select);
    },
  };
}

function moveTab(
  event: KeyboardEvent<HTMLButtonElement>,
  selected: number,
  select: (index: number) => void,
) {
  const next = navigateTabs({ index: selected, key: event.key, count: TABS.length });
  if (next === undefined) return;
  event.preventDefault();
  select(next);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(next)
    .focus();
}

function closeDialog(onClose: () => void) {
  return (event: { readonly preventDefault: () => void }) => {
    event.preventDefault();
    onClose();
  };
}
