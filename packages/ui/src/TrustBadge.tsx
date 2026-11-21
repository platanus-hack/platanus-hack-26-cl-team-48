import { ICON_SIZE, ICON_STROKE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";
import type { TrustLevel } from "./types.ts";

const TRUST_ICONS: Record<TrustLevel, IconName> = {
  official: "badge-check",
  verified: "badge-check",
  org: "building-2",
  community: "users",
  deprecated: "archive",
};

export type TrustBadgeProps = {
  readonly level: TrustLevel;
  readonly label?: string;
  readonly compact?: boolean;
};

export function TrustBadge({
  level,
  label = MESSAGES.trustLevels[level],
  compact = false,
}: TrustBadgeProps) {
  const icon = (
    <Icon name={TRUST_ICONS[level]} size={ICON_SIZE.xs} strokeWidth={ICON_STROKE.bold} />
  );
  return compact ? (
    <span className={`nd-trust-dot nd-trust-${level}`} title={label} role="img" aria-label={label}>
      {icon}
    </span>
  ) : (
    <span className={`nd-trust nd-trust-${level}`}>
      {icon}
      {label}
    </span>
  );
}
