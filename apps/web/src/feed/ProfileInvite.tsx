import { Icon } from "@nodomics/ui";
import type { ReactNode } from "react";
import { MESSAGES } from "../messages.ts";

/** The friendly nudge to fill the collaboration card; the caller supplies the button or link. */
export function ProfileInvite({ children }: { readonly children: ReactNode }) {
  return (
    <div className="web-feed-invite">
      <span className="web-feed-invite-icon">
        <Icon name="sparkles" />
      </span>
      <p>{MESSAGES.feed.invite.text}</p>
      {children}
    </div>
  );
}
