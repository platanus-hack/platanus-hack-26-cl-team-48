import type { HubProfile } from "@nodomics/hub";
import { Button } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { useHub, useHubProfile } from "./hub-context.ts";
import { SignInDialog } from "./SignInDialog.tsx";

/** "Entrar" while signed out; the account menu (profile, sign out) while signed in. */
export function AccountButton() {
  const profile = useHubProfile();
  return profile === undefined ? <SignInButton /> : <AccountMenu profile={profile} />;
}

function SignInButton() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button
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
    <div className="web-account">
      <Button
        icon="user"
        label={MESSAGES.account.menu(profile.displayName)}
        onClick={() => {
          setOpen(!isOpen);
        }}
      />
      {isOpen && (
        <div className="web-account-menu">
          <RouteLink route={{ page: "profile", handle: profile.handle }}>
            {MESSAGES.account.profile}
          </RouteLink>
          <Button
            variant="ghost"
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
