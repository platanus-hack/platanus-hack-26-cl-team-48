import { classNames } from "./class-names.ts";
import { MESSAGES } from "./messages.ts";
import { TypeGlyph } from "./TypeGlyph.tsx";
import type { DataType } from "./types.ts";

const REQUIRED_MARK = "•";

export type PortProps = {
  readonly direction?: "in" | "out";
  readonly name?: string;
  readonly type: DataType;
  readonly connected?: boolean;
  readonly optional?: boolean;
  readonly multi?: boolean;
  readonly showType?: boolean;
  readonly state?: "compatible" | "incompatible";
};

export function Port({
  direction = "in",
  name,
  type,
  connected = false,
  optional = false,
  multi = false,
  showType = false,
  state,
}: PortProps) {
  const typeName = MESSAGES.dataTypes[type];
  const isMissing = direction === "in" && !connected && !optional;
  const glyph = (
    <span
      className="nd-port-hit"
      title={multi ? `${typeName} · ${MESSAGES.port.acceptsMany}` : typeName}
    >
      <TypeGlyph type={type} filled={connected} multi={multi} />
    </span>
  );
  const label = (
    <span className="nd-port-label">
      <span className={classNames(optional && "nd-port-opt")}>{name ?? typeName}</span>
      {showType && <span className="nd-port-type">{typeName}</span>}
      {isMissing && (
        <span className="nd-port-req" title={MESSAGES.port.requiredUnconnected}>
          {REQUIRED_MARK}
        </span>
      )}
    </span>
  );
  return (
    <div className={classNames("nd-port", `nd-port-${direction}`, state && `nd-port-${state}`)}>
      {direction === "in" ? glyph : label}
      {direction === "in" ? label : glyph}
    </div>
  );
}
