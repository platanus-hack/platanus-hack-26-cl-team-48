import type { HubErrorKind, OAuthProvider, SignInMethod } from "@nodomics/hub";
import { Button, Field, Input, Notice } from "@nodomics/ui";
import { useState } from "react";
import { MESSAGES } from "../messages.ts";
import { HubDialog } from "./HubDialog.tsx";
import { useHub } from "./hub-context.ts";

type Kind = SignInMethod["kind"];
type Status =
  | { readonly state: "idle" }
  | { readonly state: "sending"; readonly kind: Kind }
  | { readonly state: "check-email"; readonly message: string }
  | { readonly state: "failed"; readonly message: string };

const IDLE: Status = { state: "idle" };

/** Sign in with GitHub, Google, email and password, or a link by email (ADR 0018 and 0035). */
export function SignInDialog({ onClose }: { readonly onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, signIn] = useSignIn();
  const withProvider = (provider: OAuthProvider) => () => {
    signIn({ kind: "provider", provider });
  };
  const withPassword = (kind: "password" | "sign-up") => () => {
    signIn({ kind, email: email.trim(), password });
  };
  const isLoading = (kind: Kind) => status.state === "sending" && status.kind === kind;
  const hasCredentials = email.trim() !== "" && password !== "";
  return (
    <HubDialog title={MESSAGES.account.signInTitle} onClose={onClose}>
      <div className="web-hub-form">
        <Button onClick={withProvider("github")}>{MESSAGES.account.github}</Button>
        <Button onClick={withProvider("google")}>{MESSAGES.account.google}</Button>
        <Field label={MESSAGES.account.email}>
          <Input type="email" value={email} onChange={setEmail} />
        </Field>
        <Field label={MESSAGES.account.password}>
          <Input type="password" value={password} onChange={setPassword} />
        </Field>
        <div className="web-hub-dialog-actions">
          <Button
            disabled={!hasCredentials}
            loading={isLoading("sign-up")}
            onClick={withPassword("sign-up")}
          >
            {MESSAGES.account.signUp}
          </Button>
          <Button
            variant="primary"
            disabled={!hasCredentials}
            loading={isLoading("password")}
            onClick={withPassword("password")}
          >
            {MESSAGES.account.signInWithPassword}
          </Button>
        </div>
        <Button
          variant="ghost"
          disabled={email.trim() === ""}
          loading={isLoading("email")}
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
  if (status.state === "check-email") return <p>{status.message}</p>;
  if (status.state === "failed") return <Notice tone="error" title={status.message} />;
  return null;
}

function useSignIn(): readonly [Status, (method: SignInMethod) => void] {
  const hub = useHub();
  const [status, setStatus] = useState<Status>(IDLE);
  const signIn = (method: SignInMethod) => {
    setStatus({ state: "sending", kind: method.kind });
    void hub.signIn(method).then(async (result) => {
      if (!result.ok) setStatus(failureOf(method.kind, result.error.kind));
      else setStatus(await statusAfterSignIn(method.kind, () => hub.currentProfile()));
    });
  };
  return [status, signIn];
}

async function statusAfterSignIn(
  kind: Kind,
  currentProfile: () => Promise<unknown>,
): Promise<Status> {
  if (kind === "email") return { state: "check-email", message: MESSAGES.account.checkEmail };
  if (kind !== "sign-up" || (await currentProfile()) !== undefined) return IDLE;
  return { state: "check-email", message: MESSAGES.account.confirmEmail };
}

function failureOf(kind: Kind, errorKind: HubErrorKind): Status {
  if (errorKind !== "invalid") return { state: "failed", message: MESSAGES.account.failed };
  if (kind === "password") return { state: "failed", message: MESSAGES.account.wrongPassword };
  if (kind === "sign-up") return { state: "failed", message: MESSAGES.account.signUpFailed };
  return { state: "failed", message: MESSAGES.account.failed };
}
