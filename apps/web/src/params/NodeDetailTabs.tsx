import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { navigateTabs } from "../preview/tab-navigation.ts";
import { MESSAGES } from "../messages.ts";

export type NodeDetailTab = keyof typeof MESSAGES.params.tabs;

const FIRST_TAB: NodeDetailTab = "params";

type NodeDetailTabsProps = {
  readonly tabs: readonly NodeDetailTab[];
  readonly children: (tab: NodeDetailTab) => ReactNode;
};

export function NodeDetailTabs({ tabs, children }: NodeDetailTabsProps) {
  const id = useId();
  const [chosen, setSelected] = useState<NodeDetailTab>(FIRST_TAB);
  // A tab can leave while chosen (another node, or signing out): the first one takes its place.
  const selected = tabs.includes(chosen) ? chosen : FIRST_TAB;
  return (
    <>
      <div
        className="web-seg web-seg-md web-params-tabs"
        role="tablist"
        aria-label={MESSAGES.params.details}
      >
        {tabs.map((tab) => (
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
              selectAdjacentTab(event, { tabs, selected, onSelect: setSelected });
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
    tabs,
    selected,
    onSelect,
  }: {
    readonly tabs: readonly NodeDetailTab[];
    readonly selected: NodeDetailTab;
    readonly onSelect: (tab: NodeDetailTab) => void;
  },
) {
  const index = navigateTabs({ index: tabs.indexOf(selected), key: event.key, count: tabs.length });
  const next = index === undefined ? undefined : tabs[index];
  if (index === undefined || next === undefined) return;
  event.preventDefault();
  onSelect(next);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(index)
    .focus();
}
