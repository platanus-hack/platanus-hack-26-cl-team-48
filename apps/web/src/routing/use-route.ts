import { useMemo, useSyncExternalStore } from "react";
import { pathOf, routeOf, type Route } from "./routes.ts";

const POPSTATE = "popstate";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener(POPSTATE, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(POPSTATE, listener);
  };
}

const currentPath = () => window.location.pathname;

/** The page of the current address; follows `navigate` and the browser's back and forward. */
export function useRoute(): Route {
  const path = useSyncExternalStore(subscribe, currentPath);
  return useMemo(() => routeOf(path), [path]);
}

/** Opens a page without reloading the app, keeping the `#` of a shared flow out of it. */
export function navigate(route: Route): void {
  window.history.pushState(null, "", pathOf(route));
  listeners.forEach((listener) => {
    listener();
  });
}
