import { expect, type Locator, type Page } from "@playwright/test";

/** Without Supabase keys the in-memory hub has a single test account, lost on reload (ADR 0023). */
export const LOCAL_ACCOUNT = { handle: "local", name: "Cuenta local" } as const;

export const toolbarOf = (page: Page): Locator =>
  page.getByRole("banner", { name: "Acciones del flujo" });

/** The top bar's saving status, only while it reads exactly `text`. */
export const flowStatus = (page: Page, text: string): Locator =>
  toolbarOf(page)
    .getByRole("status")
    .and(page.getByText(text, { exact: true }));

export const signInDialogOf = (page: Page): Locator =>
  page.getByRole("dialog", { name: "Entrar a Nodomics" });

export const accountMenuButton = (page: Page): Locator =>
  toolbarOf(page).getByRole("button", { name: `Cuenta de ${LOCAL_ACCOUNT.name}` });

/** Signs in to the local account from the top bar's "Entrar", with a provider button. */
export async function signInLocally(page: Page): Promise<void> {
  await toolbarOf(page).getByRole("button", { name: "Entrar", exact: true }).click();
  await signInDialogOf(page).getByRole("button", { name: "Continuar con GitHub" }).click();
  await expect(accountMenuButton(page)).toBeVisible();
}

export async function signOut(page: Page): Promise<void> {
  await accountMenuButton(page).click();
  await toolbarOf(page).getByRole("button", { name: "Salir", exact: true }).click();
  await expect(toolbarOf(page).getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
}
