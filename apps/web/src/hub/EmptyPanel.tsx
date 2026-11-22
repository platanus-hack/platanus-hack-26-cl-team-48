import type { IconName } from "@nodomics/ui";
import type { ReactNode } from "react";
import { IconChip } from "./IconChip.tsx";

/** An empty page of the hub: an icon chip, one line of explanation and the action to take. */
export function EmptyPanel({
  icon,
  text,
  children,
}: {
  readonly icon: IconName;
  readonly text: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="web-hub-empty-panel">
      <IconChip name={icon} />
      <p>{text}</p>
      {children}
    </div>
  );
}
