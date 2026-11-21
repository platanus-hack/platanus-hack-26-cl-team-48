import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RouteLink } from "./RouteLink.tsx";
import type { Route } from "./routes.ts";
import { useRoute } from "./use-route.ts";

const PUBLICATION: Route = { page: "publication", handle: "ana", slug: "ventas" };

function Page() {
  const route = useRoute();
  return (
    <>
      <p role="status">{route.page}</p>
      <RouteLink route={PUBLICATION} className="card-link">
        Ventas altas
      </RouteLink>
    </>
  );
}

/** Whether the click reached the document with its default action (a full page load) cancelled. */
function watchDefaultPrevented(): () => boolean | undefined {
  let prevented: boolean | undefined;
  const listener = (event: MouseEvent) => {
    prevented = event.defaultPrevented;
  };
  document.addEventListener("click", listener);
  return () => {
    document.removeEventListener("click", listener);
    return prevented;
  };
}

const link = () => screen.getByRole("link", { name: "Ventas altas" });

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("RouteLink", () => {
  it("links to the route's address", () => {
    render(<Page />);

    expect(link().getAttribute("href")).toBe("/hub/ana/ventas");
  });

  it("keeps the class it is given", () => {
    render(<Page />);

    expect(link().classList.contains("card-link")).toBe(true);
  });

  it("goes to the route within the app on a plain click", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const stopWatching = watchDefaultPrevented();

    await user.click(link());

    expect({
      path: window.location.pathname,
      shown: screen.getByRole("status").textContent,
      prevented: stopWatching(),
    }).toEqual({ path: "/hub/ana/ventas", shown: "publication", prevented: true });
  });

  it.each(["Control", "Meta", "Shift", "Alt"])(
    "leaves a click with %s to the browser",
    async (key) => {
      const user = userEvent.setup();
      render(<Page />);
      const stopWatching = watchDefaultPrevented();

      await user.keyboard(`{${key}>}`);
      await user.click(link());
      await user.keyboard(`{/${key}}`);

      expect({
        path: window.location.pathname,
        shown: screen.getByRole("status").textContent,
        prevented: stopWatching(),
      }).toEqual({ path: "/", shown: "workspace", prevented: false });
    },
  );

  it("leaves a click with another mouse button to the browser", () => {
    render(<Page />);
    const stopWatching = watchDefaultPrevented();

    fireEvent.click(link(), { button: 1 });

    expect({ path: window.location.pathname, prevented: stopWatching() }).toEqual({
      path: "/",
      prevented: false,
    });
  });
});
