import { classNames } from "./class-names.ts";
import { useFieldControl } from "./field-context.ts";
import { ICON_SIZE, Icon } from "./Icon.tsx";

export type SelectOption = string | { readonly value: string; readonly label: string };

export type SelectProps = {
  readonly options: ReadonlyArray<SelectOption>;
  readonly value?: string;
  readonly size?: "sm" | "md";
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly label?: string;
  readonly onChange?: ((value: string) => void) | undefined;
};

export function Select({
  options,
  value,
  size = "md",
  disabled = false,
  invalid,
  label,
  onChange,
}: SelectProps) {
  const { id, isInvalid } = useFieldControl(invalid);
  return (
    <div
      className={classNames("nd-select", isInvalid && "nd-invalid", size === "sm" && "nd-input-sm")}
    >
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {options.map(toOption).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={ICON_SIZE.sm} />
    </div>
  );
}

function toOption(option: SelectOption): { readonly value: string; readonly label: string } {
  return typeof option === "string" ? { value: option, label: option } : option;
}
