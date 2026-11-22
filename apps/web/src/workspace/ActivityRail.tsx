import { Icon, type IconName } from "@nodomics/ui";
import type { Ref } from "react";
import { type SideSection, type Theme } from "../layout/workspace-preferences.ts";
import { pathOf } from "../routing/routes.ts";
import { MESSAGES } from "../messages.ts";
import { ThemeControl } from "../theme/ThemeControl.tsx";

const SECTION_ICONS: Record<SideSection, IconName> = {
  nodes: "layout-grid",
  "my-nodes": "boxes",
  data: "database",
  secrets: "key-round",
  agent: "sparkles",
};

type ActivityRailProps = {
  /** The sections this user can open; account sections need a session. */
  readonly sections: ReadonlyArray<SideSection>;
  /** The section shown in the side panel, or `undefined` when the panel is hidden. */
  readonly shown: SideSection | undefined;
  readonly onSelect: (section: SideSection) => void;
  readonly theme: Theme;
  readonly onThemeChange: (theme: Theme) => void;
  readonly ref?: Ref<HTMLElement>;
};

/** The editor's sections down the left edge, the hub (in its own tab) and the theme. */
export function ActivityRail({
  sections,
  shown,
  onSelect,
  theme,
  onThemeChange,
  ref,
}: ActivityRailProps) {
  return (
    <nav ref={ref} className="web-rail" aria-label={MESSAGES.rail.label}>
      {sections.map((section) => (
        <RailButton
          key={section}
          section={section}
          isPressed={section === shown}
          onSelect={onSelect}
        />
      ))}
      <span className="web-rail-spacer" />
      <a
        className="web-rail-button"
        href={pathOf({ page: "hub" })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={MESSAGES.rail.openHub}
        title={MESSAGES.rail.openHub}
      >
        <Icon name="globe" />
      </a>
      <ThemeControl theme={theme} onChange={onThemeChange} />
    </nav>
  );
}

function RailButton({
  section,
  isPressed,
  onSelect,
}: {
  readonly section: SideSection;
  readonly isPressed: boolean;
  readonly onSelect: (section: SideSection) => void;
}) {
  const label = MESSAGES.rail.sections[section];
  return (
    <>
      {section === "agent" && <span className="web-rail-divider" aria-hidden="true" />}
      <button
        type="button"
        className="web-rail-button"
        data-section={section}
        aria-pressed={isPressed}
        aria-label={label}
        title={label}
        onClick={() => {
          onSelect(section);
        }}
      >
        <Icon name={SECTION_ICONS[section]} />
      </button>
    </>
  );
}

/** Hiding the side panel removes the focused button, so focus goes back to its section. */
export function focusRailSection(rail: HTMLElement | null, section: SideSection) {
  rail?.querySelector<HTMLElement>(`[data-section="${section}"]`)?.focus();
}
