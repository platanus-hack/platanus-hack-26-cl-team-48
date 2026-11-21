import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "./index.ts";

const REQUESTED_ICONS: ReadonlyArray<IconName> = [
  "chevron-left",
  "redo",
  "download",
  "minus",
  "maximize",
  "minimize-2",
  "maximize-2",
  "sun",
  "moon",
  "monitor",
  "panel-bottom-close",
];

const FLOATING_LAYOUT_ICONS = [
  "undo-2",
  "redo-2",
  "calculator",
  "layers",
  "list-end",
  "arrow-up-down",
  "terminal",
  "panel-left-close",
  "panel-left-open",
  "panel-right-close",
  "panel-right-open",
  "layout-grid",
  "panel-bottom",
  "table",
  "ban",
  "chart-line",
  "globe",
  "folder-open",
  "log-in",
  "log-out",
] as const satisfies ReadonlyArray<IconName>;

it.each(FLOATING_LAYOUT_ICONS)("draws the %s icon of the floating layout", (name) => {
  render(<Icon name={name} label={name} />);

  expect(screen.getByRole("img", { name }).children.length).toBeGreaterThan(0);
});

describe("Icon", () => {
  it.each(REQUESTED_ICONS)("draws the requested %s icon", (name) => {
    render(<Icon name={name} label={name} />);

    expect(screen.getByRole("img", { name }).querySelectorAll("path").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name }).getAttribute("viewBox")).toBe("0 0 24 24");
  });

  it("draws the shapes of the named icon", () => {
    const { container } = render(<Icon name="pause" />);

    expect(container.querySelectorAll("svg > rect")).toHaveLength(2);
  });

  it("is hidden from assistive technology when it has no label", () => {
    const { container } = render(<Icon name="play" />);

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is announced as an image when it has a label", () => {
    render(<Icon name="cloud" label="Nube" />);

    expect(screen.getByRole("img", { name: "Nube" })).toBeTruthy();
  });

  it("uses the requested size and stroke width", () => {
    const { container } = render(<Icon name="play" size={20} strokeWidth={3} />);
    const svg = container.querySelector("svg");

    expect(svg?.getAttribute("width")).toBe("20");
    expect(svg?.getAttribute("height")).toBe("20");
    expect(svg?.getAttribute("stroke-width")).toBe("3");
  });

  it("spins when asked to", () => {
    const { container } = render(<Icon name="loader-circle" spin />);

    expect(container.querySelector("svg")?.classList.contains("nd-spin")).toBe(true);
  });
  it("sizes the default icon from a token", () => {
    render(<Icon name="play" label="Play" />);
    expect(screen.getByRole("img").getAttribute("width")).toBe("var(--icon-md)");
  });
});
