import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { navigateTabs } from "../preview/tab-navigation.ts";
import { MESSAGES } from "../messages.ts";

export type NodeDetailTab = keyof typeof MESSAGES.params.tabs;

const TABS: readonly NodeDetailTab[] = ["params", "ports", "history"];

type NodeDetailTabsProps = {
  readonly children: (tab: NodeDetailTab) => ReactNode;
};

export function NodeDetailTabs({ children }: NodeDetailTabsProps) {
  const id = useId();
  const [selected, setSelected] = useState<NodeDetailTab>("params");
  return (
    <>
      <div
        className="web-seg web-seg-md web-params-tabs"
        role="tablist"
        aria-label={MESSAGES.params.details}
      >
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            id={`${id}-${tab}`}
            role="tab"
            aria-selected={tab === selected}
            aria-controls={`${id}-panel`}
            tabIndex={tab === selected ? 0 : -1}
            className="web-seg-button"
            onClick={() => {
              setSelected(tab);
            }}
            onKeyDown={(event) => {
              selectAdjacentTab(event, { selected, onSelect: setSelected });
            }}
          >
            {MESSAGES.params.tabs[tab]}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${selected}`}
        className="web-params-tab-panel"
        tabIndex={0}
      >
        {children(selected)}
      </div>
    </>
  );
}

function selectAdjacentTab(
  event: KeyboardEvent<HTMLButtonElement>,
  {
    selected,
    onSelect,
  }: { readonly selected: NodeDetailTab; readonly onSelect: (tab: NodeDetailTab) => void },
) {
  const index = navigateTabs({ index: TABS.indexOf(selected), key: event.key, count: TABS.length });
  const next = index === undefined ? undefined : TABS[index];
  if (index === undefined || next === undefined) return;
  event.preventDefault();
  onSelect(next);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(index)
    .focus();
}
