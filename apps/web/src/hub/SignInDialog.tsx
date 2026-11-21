import type { OAuthProvider, SignInMethod } from "@nodomics/hub";
import { Button, Field, Input, Notice } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { HubDialog } from "./HubDialog.tsx";
import { useHub } from "./hub-context.ts";

type Status = "idle" | "sending" | "sent" | "failed";

/** Sign in with GitHub, Google or a link by email (ADR 0018, point 7). */
export function SignInDialog({ onClose }: { readonly onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, signIn] = useSignIn();
  const withProvider = (provider: OAuthProvider) => () => {
    signIn({ kind: "provider", provider });
  };
  return (
    <HubDialog title={MESSAGES.account.signInTitle} onClose={onClose}>
      <div className="web-hub-form">
        <Button onClick={withProvider("github")}>{MESSAGES.account.github}</Button>
        <Button onClick={withProvider("google")}>{MESSAGES.account.google}</Button>
        <Field label={MESSAGES.account.email}>
          <Input type="email" value={email} onChange={setEmail} />
        </Field>
        <Button
          variant="primary"
          disabled={email.trim() === ""}
          loading={status === "sending"}
          onClick={() => {
            signIn({ kind: "email", email: email.trim() });
          }}
        >
          {MESSAGES.account.sendLink}
        </Button>
        <SignInStatus status={status} />
      </div>
    </HubDialog>
  );
}

function SignInStatus({ status }: { readonly status: Status }) {
  if (status === "sent") return <p>{MESSAGES.account.checkEmail}</p>;
  if (status === "failed") return <Notice tone="error" title={MESSAGES.account.failed} />;
  return null;
}

function useSignIn(): readonly [Status, (method: SignInMethod) => void] {
  const hub = useHub();
  const [status, setStatus] = useState<Status>("idle");
  const signIn = (method: SignInMethod) => {
    setStatus("sending");
    void hub.signIn(method).then((result) => {
      if (!result.ok) setStatus("failed");
      else setStatus(method.kind === "email" ? "sent" : "idle");
    });
  };
  return [status, signIn];
}
