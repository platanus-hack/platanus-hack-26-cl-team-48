import { classNames } from "./class-names.ts";
import { formatPercent } from "./format-number.ts";
import { ICON_SIZE, ICON_STROKE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";
import type { Condition, ExecState } from "./types.ts";

type Tone = "queued" | "running" | "ok" | "stale" | "warn" | "error" | "accent";
type StatusLook = { readonly icon: IconName; readonly tone: Tone };

const STATUS_LOOKS: Record<ExecState | Condition, StatusLook> = {
  idle: { icon: "circle-dashed", tone: "queued" },
  queued: { icon: "clock", tone: "queued" },
  running: { icon: "loader-circle", tone: "running" },
  done: { icon: "circle-check", tone: "ok" },
  cached: { icon: "database-zap", tone: "ok" },
  stale: { icon: "history", tone: "stale" },
  error: { icon: "circle-alert", tone: "error" },
  cancelled: { icon: "circle-slash", tone: "queued" },
  warning: { icon: "triangle-alert", tone: "warn" },
  incomplete: { icon: "square-dashed", tone: "warn" },
  disabled: { icon: "circle-off", tone: "queued" },
  missing: { icon: "package-x", tone: "error" },
  update: { icon: "circle-arrow-up", tone: "accent" },
  deprecated: { icon: "archive", tone: "warn" },
  engine: { icon: "cpu", tone: "warn" },
  credential: { icon: "key-round", tone: "warn" },
  permission: { icon: "shield-alert", tone: "warn" },
};

const STATUS_LABELS: Record<ExecState | Condition, string> = {
  ...MESSAGES.execStates,
  ...MESSAGES.conditions,
};

const PERCENT = 100;

export const statusLabel = (state: ExecState | Condition): string => STATUS_LABELS[state];

export type StatusIndicatorProps = {
  readonly state: ExecState | Condition;
  readonly progress?: number | undefined;
  readonly compact?: boolean;
  readonly label?: string;
};

export function StatusIndicator({
  state,
  progress,
  compact = false,
  label = STATUS_LABELS[state],
}: StatusIndicatorProps) {
  const look = STATUS_LOOKS[state];
  const description = describeProgress(label, state === "running" ? progress : undefined);
  return (
    <span
      className={classNames("nd-status", `nd-tone-${look.tone}`, compact && "nd-status-compact")}
      role="status"
      title={compact ? description : undefined}
      aria-label={description}
    >
      <Icon
        name={look.icon}
        size={ICON_SIZE.sm}
        spin={state === "running"}
        strokeWidth={ICON_STROKE.bold}
      />
      {!compact && <span>{description}</span>}
    </span>
  );
}

function describeProgress(label: string, progress: number | undefined): string {
  return progress === undefined
    ? label
    : `${label} ${formatPercent(Math.round(progress * PERCENT) / PERCENT)}`;
}
