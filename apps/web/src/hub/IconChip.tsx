import { Icon, type IconName } from "@nodomics/ui";

/** A feature icon: the glyph in the page colour inside a solid round chip of the accent. */
export function IconChip({ name }: { readonly name: IconName }) {
  return (
    <span className="web-icon-chip" aria-hidden="true">
      <Icon name={name} size="var(--icon-chip-glyph)" />
    </span>
  );
}
