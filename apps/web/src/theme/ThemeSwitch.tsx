import { Icon, ICON_SIZE } from "@nodomics/ui";
import { useEffect } from "react";
import { LAYOUT_MESSAGES as M } from "../layout/messages.ts";
import type { Theme } from "../layout/workspace-preferences.ts";
import { applyTheme } from "./ThemeControl.tsx";

type Choice = Exclude<Theme, "system">;

const CHOICES: ReadonlyArray<{
  readonly value: Choice;
  readonly icon: "sun" | "moon";
  readonly label: string;
}> = [
  { value: "light", icon: "sun", label: M.light },
  { value: "dark", icon: "moon", label: M.dark },
];

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** "system" shows the option the operating system is using. */
const shownChoice = (theme: Theme): Choice =>
  theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

/** A two-option "Claro | Oscuro" switch; the pressed option is the active theme. */
export function ThemeSwitch({
  theme,
  onChange,
}: {
  readonly theme: Theme;
  readonly onChange: (theme: Theme) => void;
}) {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const shown = shownChoice(theme);
  return (
    <div className="web-theme-switch" role="group" aria-label={M.theme}>
      {CHOICES.map(({ value, icon, label }) => (
        <button
          key={value}
          type="button"
          className="web-theme-switch-option"
          aria-pressed={shown === value}
          aria-label={label}
          onClick={() => {
            onChange(value);
          }}
        >
          <Icon name={icon} size={ICON_SIZE.sm} />
          <span className="web-theme-switch-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
