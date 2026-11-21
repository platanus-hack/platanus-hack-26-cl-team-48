import { afterEach, describe, expect, it } from "vitest";
import { WORKSPACE_PREFERENCES_KEY } from "../layout/storage-workspace-preferences.ts";
import type { Theme } from "../layout/workspace-preferences.ts";
import { followStoredTheme } from "./theme-sync.ts";

const stops: Array<() => void> = [];

function follow(readTheme: () => Theme) {
  const applied: Theme[] = [];
  const stop = followStoredTheme(window, readTheme, (theme) => {
    applied.push(theme);
  });
  stops.push(stop);
  return { applied, stop };
}

const storageChange = (key: string | null) => {
  window.dispatchEvent(new StorageEvent("storage", { key }));
};

afterEach(() => {
  stops.splice(0).forEach((stop) => {
    stop();
  });
});

describe("followStoredTheme", () => {
  it("applies the stored theme when another tab changes the workspace preferences", () => {
    const { applied } = follow(() => "dark");

    storageChange(WORKSPACE_PREFERENCES_KEY);

    expect(applied).toEqual(["dark"]);
  });

  it("reads the theme when the change happens", () => {
    let stored: Theme = "light";
    const { applied } = follow(() => stored);

    stored = "dark";
    storageChange(WORKSPACE_PREFERENCES_KEY);

    expect(applied).toEqual(["dark"]);
  });

  it("applies the theme again on each change", () => {
    const themes: Theme[] = ["dark", "system"];
    const { applied } = follow(() => themes.shift() ?? "light");

    storageChange(WORKSPACE_PREFERENCES_KEY);
    storageChange(WORKSPACE_PREFERENCES_KEY);

    expect(applied).toEqual(["dark", "system"]);
  });

  it("ignores changes to other storage keys", () => {
    const { applied } = follow(() => "dark");

    storageChange("another.key");

    expect(applied).toEqual([]);
  });

  it("does not apply anything before a change", () => {
    const { applied } = follow(() => "dark");

    expect(applied).toEqual([]);
  });

  it("stops following once the returned function is called", () => {
    const { applied, stop } = follow(() => "dark");

    stop();
    storageChange(WORKSPACE_PREFERENCES_KEY);

    expect(applied).toEqual([]);
  });
});
