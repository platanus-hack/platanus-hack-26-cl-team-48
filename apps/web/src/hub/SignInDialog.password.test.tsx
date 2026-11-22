import { createMemoryHub, type Hub, type HubProfile } from "@nodomics/hub";
import { err, ok } from "@nodomics/protocol";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountButton } from "./AccountButton.tsx";
import { HubContext } from "./hub-context.ts";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };

const memoryHub = () => createMemoryHub({ profiles: [ana], now: () => "2026-11-21T00:00:00Z" });

async function openSignIn(hub: Hub) {
  render(
    <HubContext value={hub}>
      <AccountButton />
    </HubContext>,
  );
  await userEvent.click(await screen.findByRole("button", { name: "Entrar" }));
  return screen.getByRole("dialog", { name: "Entrar a Nodomics" });
}

/** Like Supabase asking to confirm the email: the call succeeds but nobody is signed in yet. */
function hubThatSignsNobodyIn() {
  const signIn = vi.fn<Hub["signIn"]>(() => Promise.resolve(ok(undefined)));
  return { hub: { ...memoryHub(), signIn }, signIn };
}

function hubThatRejects(): Hub {
  return { ...memoryHub(), signIn: () => Promise.resolve(err({ kind: "invalid" as const })) };
}

async function typeCredentials(dialog: HTMLElement, email: string, password: string) {
  await userEvent.type(within(dialog).getByRole("textbox", { name: "Correo" }), email);
  await userEvent.type(within(dialog).getByLabelText("Contraseña"), password);
}

describe("SignInDialog password field", () => {
  it("shows a password field", async () => {
    const dialog = await openSignIn(memoryHub());

    const password = within(dialog).getByLabelText("Contraseña");

    expect(password.getAttribute("type")).toBe("password");
  });
});

describe("SignInDialog sign in with password", () => {
  it("does not sign in while both email and password are empty", async () => {
    const dialog = await openSignIn(memoryHub());

    const button = within(dialog).getByRole("button", { name: "Entrar con contraseña" });

    expect(button).toHaveProperty("disabled", true);
  });

  it("does not sign in while the password is empty", async () => {
    const dialog = await openSignIn(memoryHub());

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Correo" }), "ana");

    expect(within(dialog).getByRole("button", { name: "Entrar con contraseña" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("does not sign in while the email is empty", async () => {
    const dialog = await openSignIn(memoryHub());

    await userEvent.type(within(dialog).getByLabelText("Contraseña"), "secreto");

    expect(within(dialog).getByRole("button", { name: "Entrar con contraseña" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("signs in with the trimmed email and the untouched password", async () => {
    const { hub, signIn } = hubThatSignsNobodyIn();
    const dialog = await openSignIn(hub);
    await typeCredentials(dialog, "  ana@example.com  ", " secreto ");

    await userEvent.click(within(dialog).getByRole("button", { name: "Entrar con contraseña" }));

    expect(signIn).toHaveBeenCalledWith({
      kind: "password",
      email: "ana@example.com",
      password: " secreto ",
    });
  });

  it("closes the dialog and shows the account once signed in", async () => {
    const dialog = await openSignIn(memoryHub());
    await typeCredentials(dialog, "ana", "secreto");

    await userEvent.click(within(dialog).getByRole("button", { name: "Entrar con contraseña" }));

    expect(await screen.findByRole("button", { name: "Cuenta de Ana Pérez" })).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "Entrar a Nodomics" })).toBeNull();
  });

  it("shows an alert and stays open when the credentials are wrong", async () => {
    const dialog = await openSignIn(hubThatRejects());
    await typeCredentials(dialog, "ana@example.com", "equivocada");

    await userEvent.click(within(dialog).getByRole("button", { name: "Entrar con contraseña" }));

    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "Correo o contraseña incorrectos.",
    );
    expect(screen.getByRole("dialog", { name: "Entrar a Nodomics" })).toBeDefined();
  });
});

describe("SignInDialog sign up", () => {
  it("does not create an account while the password is empty", async () => {
    const dialog = await openSignIn(memoryHub());

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Correo" }), "ana");

    expect(within(dialog).getByRole("button", { name: "Crear cuenta" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("does not create an account while the email is empty", async () => {
    const dialog = await openSignIn(memoryHub());

    await userEvent.type(within(dialog).getByLabelText("Contraseña"), "secreto");

    expect(within(dialog).getByRole("button", { name: "Crear cuenta" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("creates an account with the typed email and password", async () => {
    const { hub, signIn } = hubThatSignsNobodyIn();
    const dialog = await openSignIn(hub);
    await typeCredentials(dialog, "nueva@example.com", "secreto");

    await userEvent.click(within(dialog).getByRole("button", { name: "Crear cuenta" }));

    expect(signIn).toHaveBeenCalledWith({
      kind: "sign-up",
      email: "nueva@example.com",
      password: "secreto",
    });
  });

  it("asks to confirm the email when the new account is not signed in yet", async () => {
    const dialog = await openSignIn(hubThatSignsNobodyIn().hub);
    await typeCredentials(dialog, "nueva@example.com", "secreto");

    await userEvent.click(within(dialog).getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Revisa tu correo para confirmar tu cuenta.")).toBeDefined();
  });

  it("shows an alert when the account cannot be created", async () => {
    const dialog = await openSignIn(hubThatRejects());
    await typeCredentials(dialog, "ana@example.com", "123");

    await userEvent.click(within(dialog).getByRole("button", { name: "Crear cuenta" }));

    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "No pudimos crear la cuenta. Revisa el correo y usa una contraseña de al menos 6 caracteres.",
    );
  });
});

describe("SignInDialog email link alongside the password", () => {
  it("sends a link without needing a password", async () => {
    const { hub, signIn } = hubThatSignsNobodyIn();
    const dialog = await openSignIn(hub);
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Correo" }),
      "ana@example.com",
    );

    await userEvent.click(within(dialog).getByRole("button", { name: "Enviarme un enlace" }));

    expect(signIn).toHaveBeenCalledWith({ kind: "email", email: "ana@example.com" });
  });
});
