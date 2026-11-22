import { Button } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";

export type HubTab = "for-you" | "flows" | "people";
const TABS: readonly HubTab[] = ["for-you", "flows", "people"];

type HubTabsProps = {
  readonly tab: HubTab;
  readonly onTab: (tab: HubTab) => void;
  readonly onOpenEditor: () => void;
};

/** The signed-in hub's top navigation, with the way into the editor. */
export function HubTabs({ tab, onTab, onOpenEditor }: HubTabsProps) {
  return (
    <nav className="web-hub-tabs" aria-label={MESSAGES.hub.sections}>
      {TABS.map((value) => (
        <button
          key={value}
          type="button"
          className="web-hub-tab"
          aria-current={tab === value ? "page" : undefined}
          onClick={() => {
            onTab(value);
          }}
        >
          {MESSAGES.hub.tabs[value]}
        </button>
      ))}
      <Button variant="ghost" icon="app-window" onClick={onOpenEditor}>
        {MESSAGES.hub.openEditor}
      </Button>
    </nav>
  );
}
