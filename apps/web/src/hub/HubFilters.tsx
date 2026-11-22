import { useId } from "react";
import { MESSAGES } from "../messages.ts";
import { ALL_KINDS, type KindFilter } from "./hub-filters.ts";

const KIND_OPTIONS = ([ALL_KINDS, "flow", "node"] as const).map((value) => ({
  value,
  label: MESSAGES.hub.kinds[value],
}));

export type HubFilterState = {
  readonly kind: KindFilter;
  readonly pressedTags: ReadonlySet<string>;
};

type HubFiltersProps = {
  readonly filters: HubFilterState;
  readonly tags: ReadonlyArray<string>;
  readonly onKind: (kind: KindFilter) => void;
  readonly onTag: (tag: string) => void;
};

/** The row above the publications: which kind and which tags. */
export function HubFilters({ filters, tags, onKind, onTag }: HubFiltersProps) {
  return (
    <section className="web-hub-filters" aria-label={MESSAGES.hub.filters}>
      <KindSegments value={filters.kind} onChange={onKind} />
      {tags.length > 0 && <TagToggles tags={tags} pressed={filters.pressedTags} onTag={onTag} />}
    </section>
  );
}

function KindSegments(props: {
  readonly value: KindFilter;
  readonly onChange: (value: KindFilter) => void;
}) {
  const name = useId();
  const legend = useId();
  return (
    <fieldset className="web-hub-segments" role="radiogroup" aria-labelledby={legend}>
      <legend id={legend} className="web-visually-hidden">
        {MESSAGES.hub.kind}
      </legend>
      {KIND_OPTIONS.map((option) => (
        <label key={option.value} className="web-hub-segment">
          <input
            type="radio"
            name={name}
            checked={props.value === option.value}
            onChange={() => {
              props.onChange(option.value);
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function TagToggles(props: {
  readonly tags: ReadonlyArray<string>;
  readonly pressed: ReadonlySet<string>;
  readonly onTag: (tag: string) => void;
}) {
  const heading = useId();
  return (
    <div className="web-hub-tag-row" role="group" aria-labelledby={heading}>
      <span id={heading} className="web-visually-hidden">
        {MESSAGES.hub.tags}
      </span>
      {props.tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="web-hub-tag"
          aria-pressed={props.pressed.has(tag)}
          onClick={() => {
            props.onTag(tag);
          }}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
