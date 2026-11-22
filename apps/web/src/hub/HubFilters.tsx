import { useId } from "react";
import { MESSAGES } from "../messages.ts";
import { ALL_KINDS, type HubView, type KindFilter } from "./hub-filters.ts";
import { TagPicker } from "./TagPicker.tsx";

const KIND_OPTIONS = ([ALL_KINDS, "app", "flow", "node"] as const).map((value) => ({
  value,
  label: MESSAGES.hub.kinds[value],
}));

export type HubFilterState = {
  readonly view: HubView;
  readonly kind: KindFilter;
  readonly pressedTags: ReadonlySet<string>;
};

type HubFiltersProps = {
  readonly filters: HubFilterState;
  /** The views this user can explore; "Mis publicaciones" needs an account. */
  readonly views: ReadonlyArray<HubView>;
  readonly tags: ReadonlyArray<string>;
  readonly onView: (view: HubView) => void;
  readonly onKind: (kind: KindFilter) => void;
  readonly onTag: (tag: string) => void;
};

/** The hub's sidebar: what to explore, which kind and which tags. */
export function HubFilters({ filters, views, tags, onView, onKind, onTag }: HubFiltersProps) {
  return (
    <aside className="web-hub-filters" aria-label={MESSAGES.hub.filters}>
      <RadioList
        label={MESSAGES.hub.explore}
        options={views.map((value) => ({ value, label: MESSAGES.hub.views[value] }))}
        value={filters.view}
        onChange={onView}
      />
      <RadioList
        label={MESSAGES.hub.kind}
        options={KIND_OPTIONS}
        value={filters.kind}
        onChange={onKind}
      />
      {tags.length > 0 && <TagPicker tags={tags} pressed={filters.pressedTags} onTag={onTag} />}
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
  const legend = useId();
  return (
    <fieldset className="web-hub-filter" role="radiogroup" aria-labelledby={legend}>
      <legend id={legend} className="web-overline">
        {props.label}
      </legend>
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
