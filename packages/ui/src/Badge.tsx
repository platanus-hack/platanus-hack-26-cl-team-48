import type { ReactNode } from "react";
import { ICON_SIZE, ICON_STROKE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";

export type BadgeProps = {
  readonly tone?: "neutral" | "accent" | "ok" | "warn" | "error" | "ai";
  readonly icon?: IconName;
  readonly children?: ReactNode;
};

export function Badge({ tone = "neutral", icon, children }: BadgeProps) {
  return (
    <span className={`nd-badge nd-badge-${tone}`}>
      {icon !== undefined && (
        <Icon name={icon} size={ICON_SIZE.xs} strokeWidth={ICON_STROKE.bold} />
      )}
      {children}
    </span>
  );
}
