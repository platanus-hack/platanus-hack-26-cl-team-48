import { Icon, type IconName } from "@nodomics/ui";

type PanelToggleProps = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly labels: { readonly hide: string; readonly show: string };
  readonly icons: { readonly hide: IconName; readonly show: IconName };
};

/** Hides or shows a floating panel; the control stays in place so the panel can come back. */
export function PanelToggle({ isOpen, onToggle, labels, icons }: PanelToggleProps) {
  const label = isOpen ? labels.hide : labels.show;
  return (
    <button
      type="button"
      className="nd-btn nd-btn-ghost nd-btn-md nd-btn-icon"
      aria-label={label}
      title={label}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <Icon name={isOpen ? icons.hide : icons.show} />
    </button>
  );
}
