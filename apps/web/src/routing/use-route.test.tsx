import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { pathOf } from "./routes.ts";
import { navigate, useRoute } from "./use-route.ts";

function CurrentRoute({ label }: { readonly label: string }) {
  const route = useRoute();
  return (
    <p role="status" aria-label={label}>
      {JSON.stringify(route)}
    </p>
  );
}

const shownRoute = (label = "Ruta"): unknown =>
  JSON.parse(screen.getByRole("status", { name: label }).textContent);

const popState = () =>
  new Promise<void>((resolve) => {
    window.addEventListener(
      "popstate",
      () => {
        resolve();
      },
      { once: true },
    );
  });

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useRoute", () => {
  it("gives the route of the current address", () => {
    window.history.replaceState(null, "", "/u/ana");

    render(<CurrentRoute label="Ruta" />);

    expect(shownRoute()).toEqual({ page: "profile", handle: "ana" });
  });

  it("gives the workspace at the root", () => {
    render(<CurrentRoute label="Ruta" />);

    expect(shownRoute()).toEqual({ page: "workspace" });
  });

  it("follows the browser back to the previous route", async () => {
    window.history.replaceState(null, "", "/hub");
    render(<CurrentRoute label="Ruta" />);
    act(() => {
      navigate({ page: "profile", handle: "ana" });
    });

    const popped = popState();
    window.history.back();
    await act(() => popped);

    expect(shownRoute()).toEqual({ page: "hub" });
  });
});

describe("navigate", () => {
  it("changes the address without reloading the page", () => {
    const route = { page: "publication", handle: "ana", slug: "a/b" } as const;

    act(() => {
      navigate(route);
    });

    expect(window.location.pathname).toBe(pathOf(route));
  });

  it("adds an entry to the browser history", () => {
    const length = window.history.length;

    act(() => {
      navigate({ page: "hub" });
    });

    expect(window.history.length).toBe(length + 1);
  });

  it("updates every component that uses the route", () => {
    render(
      <>
        <CurrentRoute label="Cabecera" />
        <CurrentRoute label="Contenido" />
      </>,
    );

    act(() => {
      navigate({ page: "publication", handle: "ana", slug: "ventas" });
    });

    const expected = { page: "publication", handle: "ana", slug: "ventas" };
    expect([shownRoute("Cabecera"), shownRoute("Contenido")]).toEqual([expected, expected]);
  });
});
