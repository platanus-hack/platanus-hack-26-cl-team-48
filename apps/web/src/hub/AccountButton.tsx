import type { HubProfile } from "@nodomics/hub";
import { Button, Icon, ICON_SIZE, type ButtonProps } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { Avatar } from "./Avatar.tsx";
import { useHub, useHubProfile } from "./hub-context.ts";
import { SignInDialog } from "./SignInDialog.tsx";

/** "Entrar" while signed out; the account menu (profile, sign out) while signed in. */
export function AccountButton({
  variant = "secondary",
}: {
  readonly variant?: ButtonProps["variant"];
}) {
  const profile = useHubProfile();
  return profile === undefined ? (
    <SignInButton variant={variant} />
  ) : (
    <AccountMenu profile={profile} />
  );
}

function SignInButton({ variant }: { readonly variant: NonNullable<ButtonProps["variant"]> }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        icon="log-in"
        onClick={() => {
          setOpen(true);
        }}
      >
        {MESSAGES.account.signIn}
      </Button>
      {isOpen && (
        <SignInDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function AccountMenu({ profile }: { readonly profile: HubProfile }) {
  const hub = useHub();
  const [isOpen, setOpen] = useState(false);
  return (
    <div
      className="web-account"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="web-account-trigger"
        aria-label={MESSAGES.account.menu(profile.displayName)}
        aria-expanded={isOpen}
        onClick={() => {
          setOpen(!isOpen);
        }}
      >
        <Avatar name={profile.displayName} url={profile.avatarUrl} size="md" />
      </button>
      {isOpen && (
        <div className="web-account-menu">
          <div className="web-account-head">
            <strong>{profile.displayName}</strong>
            <span>{`@${profile.handle}`}</span>
          </div>
          <RouteLink route={{ page: "profile", handle: profile.handle }}>
            <Icon name="user" size={ICON_SIZE.sm} />
            {MESSAGES.account.profile}
          </RouteLink>
          <Button
            variant="ghost"
            size="sm"
            icon="log-out"
            onClick={() => {
              void hub.signOut();
            }}
          >
            {MESSAGES.account.signOut}
          </Button>
        </div>
      )}
    </div>
  );
}
