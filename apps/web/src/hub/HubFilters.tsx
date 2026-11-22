import { useId } from "react";
import { Field, Select } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { ALL_KINDS, type HubView, type KindFilter } from "./hub-filters.ts";

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
  readonly onCategorySelect?: (category: string) => void;
};

/** The hub's sidebar: what to explore, which kind and which tags. */
export function HubFilters({
  filters,
  views,
  tags,
  onView,
  onKind,
  onTag,
  onCategorySelect,
}: HubFiltersProps) {
  const selectedCategory = [...filters.pressedTags][0] ?? "";
  const handleCategory = (category: string) => {
    if (onCategorySelect !== undefined) {
      onCategorySelect(category);
    } else {
      if (category === "") {
        for (const t of filters.pressedTags) onTag(t);
      } else {
        for (const t of filters.pressedTags) if (t !== category) onTag(t);
        if (!filters.pressedTags.has(category)) onTag(category);
      }
    }
  };

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
      {tags.length > 0 && (
        <CategoryDropdown
          tags={tags}
          selected={selectedCategory}
          onSelect={handleCategory}
        />
      )}
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

function CategoryDropdown(props: {
  readonly tags: ReadonlyArray<string>;
  readonly selected: string;
  readonly onSelect: (category: string) => void;
}) {
  const options = [
    { value: "", label: MESSAGES.hub.allCategories },
    ...props.tags.map((tag) => ({
      value: tag,
      label: formatCategory(tag),
    })),
  ];
  return (
    <div className="web-hub-filter web-hub-category-select">
      <Field label={MESSAGES.hub.categories}>
        <Select options={options} value={props.selected} onChange={props.onSelect} />
      </Field>
    </div>
  );
}

function formatCategory(tag: string): string {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
