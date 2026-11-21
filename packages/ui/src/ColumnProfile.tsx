import { Badge } from "./Badge.tsx";
import { ColumnTypeIcon } from "./ColumnTypeIcon.tsx";
import { formatPercent } from "./format-number.ts";
import { MESSAGES } from "./messages.ts";
import type { ColumnType } from "./types.ts";

const FULL_PERCENT = 100;
const MIN_BAR_PERCENT = 2;

export type ColumnProfileProps = {
  readonly name: string;
  readonly type: ColumnType;
  readonly count: number;
  readonly nulls?: number;
  readonly bins: ReadonlyArray<number>;
  readonly range?: readonly [string, string];
  readonly stats?: ReadonlyArray<readonly [string, string]>;
  readonly issues?: string;
};

export function ColumnProfile({
  name,
  type,
  count,
  nulls = 0,
  bins,
  range,
  stats = [],
  issues,
}: ColumnProfileProps) {
  const nullRatio = count === 0 ? 0 : nulls / count;
  return (
    <div className="nd-prof">
      <div className="nd-prof-head">
        <ColumnTypeIcon type={type} />
        <span className="nd-prof-name">{name}</span>
        {issues !== undefined && (
          <Badge tone="warn" icon="triangle-alert">
            {issues}
          </Badge>
        )}
      </div>
      <Histogram name={name} bins={bins} />
      {range !== undefined && (
        <div className="nd-prof-range">
          <span>{range[0]}</span>
          <span>{range[1]}</span>
        </div>
      )}
      <div className="nd-prof-null">
        <span className="nd-prof-nullbar">
          <span style={{ width: `${String(nullRatio * FULL_PERCENT)}%` }} />
        </span>
        <span>{MESSAGES.columnProfile.nulls(formatPercent(nullRatio))}</span>
      </div>
      <dl className="nd-prof-stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Histogram({
  name,
  bins,
}: {
  readonly name: string;
  readonly bins: ReadonlyArray<number>;
}) {
  const tallest = Math.max(...bins, 1);
  return (
    <div className="nd-prof-hist" role="img" aria-label={MESSAGES.columnProfile.distribution(name)}>
      {bins.map((bin, index) => (
        <span
          // Bins are positional: the same index always means the same value interval.
          key={index}
          style={{
            height: `${String(Math.max(MIN_BAR_PERCENT, (bin / tallest) * FULL_PERCENT))}%`,
          }}
        />
      ))}
    </div>
  );
}
