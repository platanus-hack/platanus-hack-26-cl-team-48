import { createMemoryHub, type Hub, type HubProfile } from "@nodomics/hub";
import { err, ok } from "@nodomics/protocol";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountButton } from "./AccountButton.tsx";
import { HubContext } from "./hub-context.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };

const memoryHub = () => createMemoryHub({ profiles: [ana], now: () => "2026-11-21T00:00:00Z" });

function renderAccount(hub: Hub) {
  render(
    <HubContext value={hub}>
      <AccountButton />
    </HubContext>,
  );
}

async function openSignIn(hub: Hub) {
  renderAccount(hub);
  await userEvent.click(await screen.findByRole("button", { name: "Entrar" }));
  return screen.getByRole("dialog", { name: "Entrar a Nodomics" });
}

async function signedInHub() {
  const hub = memoryHub();
  await hub.signIn({ kind: "provider", provider: "github" });
  return hub;
}

/** Like a real email sign-in: the link is sent, but the profile only changes once it is opened. */
function hubThatSendsLinks() {
  const signIn = vi.fn<Hub["signIn"]>(() => Promise.resolve(ok(undefined)));
  return { hub: { ...memoryHub(), signIn }, signIn };
}

describe("AccountButton signed out", () => {
  it("offers to sign in", async () => {
    renderAccount(memoryHub());

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeDefined();
  });

  it("opens a sign-in dialog with providers and an email field", async () => {
    const dialog = await openSignIn(memoryHub());

    expect(within(dialog).getByRole("button", { name: "Continuar con GitHub" })).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Continuar con Google" })).toBeDefined();
    expect(within(dialog).getByRole("textbox", { name: "Correo" })).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Enviarme un enlace" })).toBeDefined();
  });

  it("signs in with GitHub", async () => {
    const hub = memoryHub();
    const signIn = vi.fn<Hub["signIn"]>((method) => hub.signIn(method));
    const dialog = await openSignIn({ ...hub, signIn });

    await userEvent.click(within(dialog).getByRole("button", { name: "Continuar con GitHub" }));

    expect(signIn).toHaveBeenCalledWith({ kind: "provider", provider: "github" });
  });

  it("signs in with Google", async () => {
    const hub = memoryHub();
    const signIn = vi.fn<Hub["signIn"]>((method) => hub.signIn(method));
    const dialog = await openSignIn({ ...hub, signIn });

    await userEvent.click(within(dialog).getByRole("button", { name: "Continuar con Google" }));

    expect(signIn).toHaveBeenCalledWith({ kind: "provider", provider: "google" });
  });

  it("sends a sign-in link to the typed email", async () => {
    const { hub, signIn } = hubThatSendsLinks();
    const dialog = await openSignIn(hub);

    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Correo" }),
      "ana@example.com",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Enviarme un enlace" }));

    expect(signIn).toHaveBeenCalledWith({ kind: "email", email: "ana@example.com" });
  });

  it("asks to check the inbox once the link is sent", async () => {
    const dialog = await openSignIn(hubThatSendsLinks().hub);

    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Correo" }),
      "ana@example.com",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Enviarme un enlace" }));

    expect(await screen.findByText(/Revisa tu correo/)).toBeDefined();
  });

  it("does not send a link while the email is empty", async () => {
    const dialog = await openSignIn(memoryHub());

    const send = within(dialog).getByRole("button", { name: "Enviarme un enlace" });

    expect(send).toHaveProperty("disabled", true);
  });

  it("shows an alert and stays open when signing in fails", async () => {
    const hub: Hub = {
      ...memoryHub(),
      signIn: () => Promise.resolve(err({ kind: "unavailable" as const })),
    };
    const dialog = await openSignIn(hub);

    await userEvent.click(within(dialog).getByRole("button", { name: "Continuar con GitHub" }));

    expect(await within(dialog).findByRole("alert")).toBeDefined();
    expect(screen.getByRole("dialog", { name: "Entrar a Nodomics" })).toBeDefined();
  });

  it("closes the sign-in dialog with its close button", async () => {
    const dialog = await openSignIn(memoryHub());

    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog", { name: "Entrar a Nodomics" })).toBeNull();
  });
});

describe("AccountButton signed in", () => {
  it("shows the account instead of the sign-in button", async () => {
    renderAccount(await signedInHub());

    expect(await screen.findByRole("button", { name: "Cuenta de Ana Pérez" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Entrar" })).toBeNull();
  });

  it("links to the user's profile", async () => {
    renderAccount(await signedInHub());

    await userEvent.click(await screen.findByRole("button", { name: "Cuenta de Ana Pérez" }));

    expect(screen.getByRole("link", { name: "Mi perfil" }).getAttribute("href")).toBe("/u/ana");
  });

  it("signs out", async () => {
    const hub = await signedInHub();
    const signOut = vi.fn<Hub["signOut"]>(() => hub.signOut());
    renderAccount({ ...hub, signOut });
    await userEvent.click(await screen.findByRole("button", { name: "Cuenta de Ana Pérez" }));

    await userEvent.click(screen.getByRole("button", { name: "Salir" }));

    expect(signOut).toHaveBeenCalledOnce();
  });

  it("offers to sign in again after signing out", async () => {
    renderAccount(await signedInHub());
    await userEvent.click(await screen.findByRole("button", { name: "Cuenta de Ana Pérez" }));

    await userEvent.click(screen.getByRole("button", { name: "Salir" }));

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeDefined();
  });
});
