import type { ReactNode } from "react";
import { classNames } from "./class-names.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";

export type ButtonProps = {
  readonly variant?: "primary" | "secondary" | "ghost" | "danger";
  readonly size?: "sm" | "md" | "lg";
  readonly icon?: IconName;
  readonly label?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly shortcut?: string;
  readonly onClick?: (() => void) | undefined;
  readonly children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  label,
  loading = false,
  disabled = false,
  shortcut,
  onClick,
  children,
}: ButtonProps) {
  const isIconOnly = icon !== undefined && children === undefined;
  const iconSize = size === "sm" ? ICON_SIZE.sm : ICON_SIZE.md;
  return (
    <button
      type="button"
      className={classNames(
        "nd-btn",
        `nd-btn-${variant}`,
        `nd-btn-${size}`,
        isIconOnly && "nd-btn-icon",
      )}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={isIconOnly ? label : undefined}
      title={isIconOnly ? label : undefined}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <Icon name="loader-circle" spin size={iconSize} />
      ) : (
        icon !== undefined && <Icon name={icon} size={iconSize} />
      )}
      {children !== undefined && <span>{children}</span>}
      {shortcut !== undefined && <kbd className="nd-kbd">{shortcut}</kbd>}
    </button>
  );
}
