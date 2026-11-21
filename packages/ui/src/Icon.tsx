import { createElement } from "react";
import { classNames } from "./class-names.ts";
import { ICONS, type IconElement, type IconName } from "./icons.ts";

export const ICON_SIZE = {
  xs: "calc(var(--icon-md) - var(--space-1))",
  sm: "var(--icon-sm)",
  md: "var(--icon-md)",
  lg: "calc(var(--icon-md) + var(--space-1))",
} as const;
export const ICON_STROKE = { regular: 2, bold: 2.25, heavy: 3 } as const;

const VIEW_BOX = "0 0 24 24";

export type IconProps = {
  readonly name: IconName;
  readonly size?: number | string;
  readonly spin?: boolean;
  readonly strokeWidth?: number;
  readonly label?: string;
  readonly className?: string | undefined;
};

export function Icon({
  name,
  size = ICON_SIZE.md,
  spin = false,
  strokeWidth = ICON_STROKE.regular,
  label,
  className,
}: IconProps) {
  return (
    <svg
      className={classNames("nd-icon", spin && "nd-spin", className)}
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...accessibilityProps(label)}
    >
      {iconElements(name).map((element, index) =>
        createElement(element.tag, { key: index, ...element.attributes }),
      )}
    </svg>
  );
}

function iconElements(name: IconName): ReadonlyArray<IconElement> {
  return ICONS[name];
}

function accessibilityProps(label: string | undefined) {
  return label === undefined
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label } as const);
}
