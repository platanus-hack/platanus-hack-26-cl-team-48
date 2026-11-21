import { Icon, type IconName } from "@nodomics/ui";
import { useId, useRef, useState, type KeyboardEvent } from "react";

type MenuItem = {
  readonly label: string;
  readonly onSelect: () => void;
  readonly checked?: boolean;
};

export function IconMenu(props: {
  readonly label: string;
  readonly icon: IconName;
  readonly items: ReadonlyArray<MenuItem>;
  readonly disabled?: boolean;
  readonly size?: "sm" | "md";
}) {
  const [isOpen, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="web-icon-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`nd-btn nd-btn-ghost nd-btn-${props.size ?? "sm"} nd-btn-icon`}
        aria-label={props.label}
        title={props.label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        disabled={props.disabled}
        onClick={() => {
          setOpen(!isOpen);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Icon name={props.icon} />
      </button>
      {isOpen && (
        <div
          id={id}
          role="menu"
          aria-label={props.label}
          className="web-icon-menu-items"
          onKeyDown={(event) => {
            navigateMenu(event, close);
          }}
        >
          {props.items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              role={item.checked === undefined ? "menuitem" : "menuitemradio"}
              aria-checked={item.checked}
              tabIndex={-1}
              ref={index === 0 ? focusFirstItem : undefined}
              className="nd-btn nd-btn-ghost nd-btn-sm"
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function focusFirstItem(element: HTMLButtonElement | null) {
  element?.focus();
}

function navigateMenu(event: KeyboardEvent<HTMLDivElement>, close: () => void) {
  event.stopPropagation();
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
  const current = items.findIndex((item) => item === document.activeElement);
  const next = {
    ArrowDown: (current + 1) % items.length,
    ArrowUp: (current + items.length - 1) % items.length,
    Home: 0,
    End: items.length - 1,
  }[event.key];
  if (next !== undefined) {
    event.preventDefault();
    items[next]?.focus();
  }
}
