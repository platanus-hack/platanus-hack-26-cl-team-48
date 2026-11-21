import { ICON_SIZE, ICON_STROKE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";
import type { Engine } from "./types.ts";

const ENGINE_ICONS: Record<Engine, IconName> = {
  browser: "app-window",
  local: "cpu",
  cloud: "cloud",
};

export type EngineBadgeProps = {
  readonly engine: Engine;
  readonly detail?: string;
  readonly compact?: boolean;
};

export function EngineBadge({ engine, detail, compact = false }: EngineBadgeProps) {
  const { label, hint } = MESSAGES.engines[engine];
  const icon = (
    <Icon name={ENGINE_ICONS[engine]} size={ICON_SIZE.xs} strokeWidth={ICON_STROKE.bold} />
  );
  return compact ? (
    <span
      className={`nd-engine nd-engine-compact nd-engine-${engine}`}
      title={`${label} — ${hint}`}
      role="img"
      aria-label={label}
    >
      {icon}
    </span>
  ) : (
    <span className={`nd-engine nd-engine-${engine}`} title={hint}>
      {icon}
      {label}
      {detail !== undefined && <span className="nd-engine-detail">{detail}</span>}
    </span>
  );
}
