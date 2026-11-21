import { use, type MouseEvent, type ReactNode } from "react";
import { RouteLinkTargetContext } from "./route-link-target.ts";
import { pathOf, type Route } from "./routes.ts";
import { navigate } from "./use-route.ts";

const PRIMARY_BUTTON = 0;

type RouteLinkProps = {
  readonly route: Route;
  readonly className?: string;
  /** Marks the link of the page being shown (`aria-current="page"`). */
  readonly isCurrent?: boolean;
  readonly children: ReactNode;
};

/** A real link to a page: a plain click stays in the app, any other opens it as the browser would. */
export function RouteLink(props: RouteLinkProps) {
  return use(RouteLinkTargetContext) === "new-tab" ? (
    <a
      href={pathOf(props.route)}
      className={props.className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {props.children}
    </a>
  ) : (
    <InAppLink {...props} />
  );
}

function InAppLink({ route, className, isCurrent = false, children }: RouteLinkProps) {
  const followInApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    navigate(route);
  };
  return (
    <a
      href={pathOf(route)}
      className={className}
      aria-current={isCurrent ? "page" : undefined}
      onClick={followInApp}
    >
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
