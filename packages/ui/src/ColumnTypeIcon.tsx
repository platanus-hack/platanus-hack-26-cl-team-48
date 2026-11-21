import { ICON_SIZE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";
import { MESSAGES } from "./messages.ts";
import type { ColumnType } from "./types.ts";

const COLUMN_TYPE_ICONS: Record<ColumnType, IconName> = {
  number: "hash",
  text: "type",
  date: "calendar",
  bool: "toggle-left",
  geo: "boxes",
};

export type ColumnTypeIconProps = {
  readonly type: ColumnType;
  readonly showLabel?: boolean;
};

export function ColumnTypeIcon({ type, showLabel = false }: ColumnTypeIconProps) {
  const label = MESSAGES.columnTypes[type];
  return (
    <span className="nd-coltype" title={label}>
      <Icon name={COLUMN_TYPE_ICONS[type]} size={ICON_SIZE.xs} />
      {showLabel && label}
    </span>
  );
}
