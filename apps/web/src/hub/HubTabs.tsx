import type { KeyboardEvent } from "react";
import { MESSAGES } from "../messages.ts";
import { HUB_TABS, type HubTab } from "./hub-filters.ts";

type HubTabsProps = {
  readonly tab: HubTab;
  readonly ids: { readonly panel: string } & Readonly<Record<HubTab, string>>;
  /** "Mi espacio" needs an account. */
  readonly isSignedIn: boolean;
  readonly onTab: (tab: HubTab) => void;
};

/** Discover or the account's own space; arrow keys move between tabs (WAI-ARIA tabs pattern). */
export function HubTabs({ tab, ids, isSignedIn, onTab }: HubTabsProps) {
  const tabs = isSignedIn ? HUB_TABS : HUB_TABS.filter((each) => each === "discover");
  const moveWithArrows = (event: KeyboardEvent) => {
    const step = arrowStep(event.key);
    if (step === 0) return;
    const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length] ?? tab;
    onTab(next);
    document.getElementById(ids[next])?.focus();
  };
  return (
    <div
      className="web-hub-tabs"
      role="tablist"
      aria-label={MESSAGES.hub.sections}
      onKeyDown={moveWithArrows}
    >
      {tabs.map((each) => (
        <button
          key={each}
          id={ids[each]}
          type="button"
          role="tab"
          className="web-hub-tab"
          aria-selected={each === tab}
          aria-controls={ids.panel}
          tabIndex={each === tab ? 0 : -1}
          onClick={() => {
            onTab(each);
          }}
        >
          {MESSAGES.hub.tabs[each]}
        </button>
      ))}
    </div>
  );
}

const arrowStep = (key: string) => {
  if (key === "ArrowRight") return 1;
  if (key === "ArrowLeft") return -1;
  return 0;
};
