import { useId } from "react";
import { classNames } from "./class-names.ts";

export type KnotMarkProps = {
  readonly size?: number | string | undefined;
  readonly title?: string | undefined;
  readonly className?: string | undefined;
};

export function KnotMark({ size = "var(--icon-md)", title, className }: KnotMarkProps) {
  const clipId = useId();
  const accessibility =
    title !== undefined
      ? ({ role: "img", "aria-label": title } as const)
      : ({ "aria-hidden": "true" } as const);

  return (
    <svg
      className={classNames("nd-knot", className)}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      {...accessibility}
    >
      {title !== undefined && <title>{title}</title>}
      <clipPath id={clipId}>
        <path d="M16 4 h16 v18 h-16 z" />
      </clipPath>
      <circle cx="17" cy="24" r="12" stroke="var(--lineage-knot, var(--ink))" strokeWidth="3.4" />
      <circle
        cx="31"
        cy="24"
        r="12"
        stroke="var(--brand-paper, var(--surface-100))"
        strokeWidth="8"
      />
      <circle
        cx="31"
        cy="24"
        r="12"
        stroke="var(--lineage-adapt, var(--accent))"
        strokeWidth="3.4"
      />
      <g clipPath={`url(#${clipId})`}>
        <circle
          cx="17"
          cy="24"
          r="12"
          stroke="var(--brand-paper, var(--surface-100))"
          strokeWidth="8"
        />
        <circle cx="17" cy="24" r="12" stroke="var(--lineage-knot, var(--ink))" strokeWidth="3.4" />
      </g>
    </svg>
  );
}
