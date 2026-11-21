import { ICON_SIZE, Icon, type IconName } from "@nodomics/ui";

type SegmentedOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
};

type SegmentedProps<T extends string> = {
  readonly label: string;
  readonly options: ReadonlyArray<SegmentedOption<T>>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly size?: "sm" | "md";
};

/** A small set of mutually exclusive choices that are always visible. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <div className={`web-seg web-seg-${size}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="web-seg-button"
          aria-pressed={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.icon !== undefined && <Icon name={option.icon} size={ICON_SIZE.sm} />}
          {option.label}
        </button>
      ))}
    </div>
  );
}
