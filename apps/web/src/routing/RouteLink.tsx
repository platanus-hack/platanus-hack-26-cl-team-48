import type { MouseEvent, ReactNode } from "react";
import { pathOf, type Route } from "./routes.ts";
import { navigate } from "./use-route.ts";

const PRIMARY_BUTTON = 0;

type RouteLinkProps = {
  readonly route: Route;
  readonly className?: string;
  readonly children: ReactNode;
};

/** A real link to a page: a plain click stays in the app, any other opens it as the browser would. */
export function RouteLink({ route, className, children }: RouteLinkProps) {
  const followInApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    navigate(route);
  };
  return (
    <a href={pathOf(route)} className={className} onClick={followInApp}>
      {children}
    </a>
  );
}

const isModifiedClick = (event: MouseEvent) =>
  event.button !== PRIMARY_BUTTON ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey;
