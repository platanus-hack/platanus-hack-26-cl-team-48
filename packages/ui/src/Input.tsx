import { classNames } from "./class-names.ts";
import { useFieldControl } from "./field-context.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";
import type { IconName } from "./icons.ts";

export type InputProps = {
  readonly type?: string;
  readonly value?: string;
  readonly placeholder?: string;
  readonly unit?: string;
  readonly icon?: IconName;
  readonly mono?: boolean;
  readonly size?: "sm" | "md";
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly label?: string;
  readonly onChange?: ((value: string) => void) | undefined;
};

export function Input({
  type = "text",
  value,
  placeholder,
  unit,
  icon,
  mono = false,
  size = "md",
  disabled = false,
  invalid,
  label,
  onChange,
}: InputProps) {
  const { id, isInvalid } = useFieldControl(invalid);
  return (
    <div
      className={classNames(
        "nd-input",
        isInvalid && "nd-invalid",
        disabled && "nd-disabled",
        size === "sm" && "nd-input-sm",
        mono && "nd-input-mono",
      )}
    >
      {icon !== undefined && <Icon name={icon} size={ICON_SIZE.sm} />}
      <input
        id={id}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={onChange === undefined}
        aria-label={label}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {unit !== undefined && <span className="nd-input-unit">{unit}</span>}
    </div>
  );
}
