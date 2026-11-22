import { Icon, ICON_SIZE } from "@nodomics/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { MESSAGES } from "../messages.ts";
import { normalize } from "./hub-filters.ts";

type TagPickerProps = {
  readonly tags: ReadonlyArray<string>;
  readonly pressed: ReadonlySet<string>;
  readonly onTag: (tag: string) => void;
};

const { tags: TAGS_LABEL, tagSearch, tagNone, tagRemove, tagClear } = MESSAGES.hub;

/** The tags whose folded text holds the folded query, so "region" finds "región". */
export const tagsMatching = (tags: ReadonlyArray<string>, query: string): string[] => {
  const needle = normalize(query.trim());
  return tags.filter((tag) => normalize(tag).includes(needle));
};

/**
 * The hub's tag filter: a search field that opens a list of every tag to press or lift, and below
 * it only the pressed tags, each one removable.
 */
export function TagPicker({ tags, pressed, onTag }: TagPickerProps) {
  const heading = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const options = useMemo(() => tagsMatching(tags, query), [tags, query]);
  const selected = tags.filter((tag) => pressed.has(tag));
  const activeTag = open ? options[active] : undefined;
  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useOutsideClose(root, open, close);

  const choose = (tag: string) => {
    onTag(tag);
    setActive(Math.max(0, options.indexOf(tag)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = KEY_STEPS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => wrap(index + (open ? step : 0), options.length));
    } else if (event.key === "Enter" && activeTag !== undefined) {
      event.preventDefault();
      choose(activeTag);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="web-hub-filter web-hub-tag-picker" ref={root}>
      <span id={heading} className="web-overline">
        {TAGS_LABEL}
        {selected.length > 0 && <span className="web-hub-tag-count">{selected.length}</span>}
      </span>
      <div className="web-hub-tag-field" data-open={open}>
        <Icon name="search" size={ICON_SIZE.sm} />
        <input
          type="text"
          role="combobox"
          aria-labelledby={heading}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeTag === undefined ? undefined : optionId(listId, activeTag)}
          placeholder={tagSearch}
          value={query}
          onFocus={() => {
            setOpen(true);
          }}
          onClick={() => {
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <span className="web-hub-tag-chevron">
          <Icon name="chevron-down" size={ICON_SIZE.sm} />
        </span>
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-multiselectable="true" className="web-hub-tag-list">
          {options.length === 0 ? (
            <li className="web-hub-tag-empty">{tagNone}</li>
          ) : (
            options.map((tag) => (
              <li
                key={tag}
                id={optionId(listId, tag)}
                role="option"
                aria-selected={pressed.has(tag)}
                data-active={tag === activeTag}
                className="web-hub-tag-option"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  choose(tag);
                }}
              >
                <span className="web-hub-tag-check">
                  {pressed.has(tag) && <Icon name="check" size={ICON_SIZE.xs} />}
                </span>
                {tag}
              </li>
            ))
          )}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="web-hub-tags web-hub-tags-selected">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              className="web-hub-tag"
              aria-pressed="true"
              aria-label={tagRemove(tag)}
              onClick={() => {
                onTag(tag);
              }}
            >
              {tag}
              <Icon name="x" size={ICON_SIZE.xs} />
            </button>
          ))}
          {selected.length > 1 && (
            <button
              type="button"
              className="web-hub-tag-clear"
              onClick={() => {
                for (const tag of selected) onTag(tag);
              }}
            >
              {tagClear}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const KEY_STEPS: Readonly<Partial<Record<string, number>>> = { ArrowDown: 1, ArrowUp: -1 };

const wrap = (index: number, length: number) => (length === 0 ? 0 : (index + length) % length);

const optionId = (listId: string, tag: string) => `${listId}-${tag}`;

/** Closes the list on a press outside it, so the sidebar does not stay covered. */
function useOutsideClose(root: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target) !== true) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [root, open, close]);
}
