import { IconMenu } from "../layout/IconMenu.tsx";
import { useEffect } from "react";
import { LAYOUT_MESSAGES as M } from "../layout/messages.ts";
import type { Theme } from "../layout/workspace-preferences.ts";
const THEME_ICONS = { light: "sun", dark: "moon", system: "monitor" } as const;

export function ThemeControl({
  theme,
  onChange,
}: {
  readonly theme: Theme;
  readonly onChange: (theme: Theme) => void;
}) {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return (
    <IconMenu
      size="md"
      label={M.theme}
      icon={THEME_ICONS[theme]}
      items={(
        [
          { value: "light", label: M.light },
          { value: "dark", label: M.dark },
          { value: "system", label: M.system },
        ] as const
      ).map((item) => ({
        label: item.label,
        checked: item.value === theme,
        onSelect: () => {
          onChange(item.value);
        },
      }))}
    />
  );
}

/** "system" leaves the theme to the operating system's preference. */
export function applyTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset["theme"] = theme;
}
