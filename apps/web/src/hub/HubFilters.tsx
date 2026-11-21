import { useId } from "react";
import { MESSAGES } from "../messages.ts";
import { ALL_KINDS, HUB_VIEWS, type HubView, type KindFilter } from "./hub-filters.ts";

const KIND_OPTIONS = ([ALL_KINDS, "flow", "node"] as const).map((value) => ({
  value,
  label: MESSAGES.hub.kinds[value],
}));

const VIEW_OPTIONS = HUB_VIEWS.map((value) => ({ value, label: MESSAGES.hub.views[value] }));

export type HubFilterState = {
  readonly view: HubView;
  readonly kind: KindFilter;
  readonly pressedTags: ReadonlySet<string>;
};

type HubFiltersProps = {
  readonly filters: HubFilterState;
  readonly tags: ReadonlyArray<string>;
  readonly onView: (view: HubView) => void;
  readonly onKind: (kind: KindFilter) => void;
  readonly onTag: (tag: string) => void;
};

/** The hub's sidebar: what to explore, which kind and which tags. */
export function HubFilters({ filters, tags, onView, onKind, onTag }: HubFiltersProps) {
  return (
    <aside className="web-hub-filters" aria-label={MESSAGES.hub.filters}>
      <RadioList
        label={MESSAGES.hub.explore}
        options={VIEW_OPTIONS}
        value={filters.view}
        onChange={onView}
      />
      <RadioList
        label={MESSAGES.hub.kind}
        options={KIND_OPTIONS}
        value={filters.kind}
        onChange={onKind}
      />
      {tags.length > 0 && <TagToggles tags={tags} pressed={filters.pressedTags} onTag={onTag} />}
    </aside>
  );
}

function RadioList<T extends string>(props: {
  readonly label: string;
  readonly options: ReadonlyArray<{ readonly value: T; readonly label: string }>;
  readonly value: T;
  readonly onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="web-hub-filter" role="radiogroup" aria-label={props.label}>
      <legend className="web-overline">{props.label}</legend>
      {props.options.map((option) => (
        <label key={option.value} className="web-hub-filter-option">
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
    <div className="web-hub-filter" role="group" aria-labelledby={heading}>
      <span id={heading} className="web-overline">
        {MESSAGES.hub.tags}
      </span>
      <div className="web-hub-tags">
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
    </div>
  );
}
