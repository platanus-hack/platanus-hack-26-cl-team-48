import { useId, type KeyboardEvent, type ReactNode } from "react";
import { navigateTabs } from "./tab-navigation.ts";
import { MESSAGES } from "../messages.ts";

export type PreviewTab = keyof typeof MESSAGES.preview.tabs;

type PreviewTabsProps = {
  readonly tabs: ReadonlyArray<PreviewTab>;
  readonly selected: PreviewTab;
  readonly onSelect: (tab: PreviewTab) => void;
  readonly children: ReactNode;
  readonly header?: (tabs: ReactNode) => ReactNode;
};

export function PreviewTabs({
  tabs,
  selected,
  onSelect,
  children,
  header = (tabs) => tabs,
}: PreviewTabsProps) {
  const id = useId();
  return (
    <>
      {header(
        <div className="web-seg web-seg-md" role="tablist" aria-label={MESSAGES.preview.content}>
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              id={`${id}-${tab}`}
              role="tab"
              aria-selected={tab === selected}
              aria-controls={`${id}-${tab}-panel`}
              tabIndex={tab === selected ? 0 : -1}
              className="web-seg-button"
              onClick={() => {
                onSelect(tab);
              }}
              onKeyDown={(event) => {
                selectAdjacentTab(event, { tabs, selected, onSelect });
              }}
            >
              {MESSAGES.preview.tabs[tab]}
            </button>
          ))}
        </div>,
      )}
      {tabs.map((tab) => (
        <div
          key={tab}
          id={`${id}-${tab}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${tab}`}
          hidden={tab !== selected}
          tabIndex={0}
        >
          {tab === selected ? children : null}
        </div>
      ))}
    </>
  );
}

function selectAdjacentTab(
  event: KeyboardEvent<HTMLButtonElement>,
  props: Omit<PreviewTabsProps, "children">,
) {
  const index = navigateTabs({
    index: props.tabs.indexOf(props.selected),
    key: event.key,
    count: props.tabs.length,
  });
  if (index === undefined) return;
  event.preventDefault();
  const next = props.tabs[index];
  if (next === undefined) return;
  props.onSelect(next);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(index)
    .focus();
}
