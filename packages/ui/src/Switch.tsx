import { classNames } from "./class-names.ts";
import { useFieldControl } from "./field-context.ts";

export type SwitchProps = {
  readonly checked?: boolean;
  readonly label?: string;
  readonly onChange?: ((checked: boolean) => void) | undefined;
};

export function Switch({ checked = false, label, onChange }: SwitchProps) {
  const { id } = useFieldControl(undefined);
  return (
    <label className="nd-switch">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={classNames("nd-switch-track", checked && "nd-on")}
        onClick={() => onChange?.(!checked)}
      >
        <span className="nd-switch-thumb" />
      </button>
      {label !== undefined && <span>{label}</span>}
    </label>
  );
}
