import { expect, type Locator, type Page } from "@playwright/test";

/** The aside each button of the activity rail shows. */
const PANEL_OF_SECTION = {
  Nodos: "Biblioteca de nodos",
  "Mis flujos": "Mis flujos",
  "Mis nodos": "Mis nodos",
  Datos: "Datos",
  Credenciales: "Credenciales",
  Agente: "Agente",
} as const;

export type SideSection = keyof typeof PANEL_OF_SECTION;

export const SIDE_SECTIONS = Object.keys(PANEL_OF_SECTION) as ReadonlyArray<SideSection>;

const SECTIONS_NEEDING_ACCOUNT: ReadonlyArray<SideSection> = ["Mis flujos", "Agente"];

/** The sections the rail shows while signed out; the rest need an account (ADR 0023). */
export const SIGNED_OUT_SECTIONS = SIDE_SECTIONS.filter(
  (section) => !SECTIONS_NEEDING_ACCOUNT.includes(section),
);

export const railOf = (page: Page): Locator =>
  page.getByRole("navigation", { name: "Secciones del editor" });

export const railButton = (page: Page, section: SideSection): Locator =>
  railOf(page).getByRole("button", { name: section, exact: true });

export const sidePanelOf = (page: Page, section: SideSection): Locator =>
  page.getByRole("complementary", { name: PANEL_OF_SECTION[section], exact: true });

/** Shows a section in the side panel; choosing the section already shown would hide it. */
export async function showSidePanel(page: Page, section: SideSection): Promise<Locator> {
  const button = railButton(page, section);
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  await expect(sidePanelOf(page, section)).toBeVisible();
  return sidePanelOf(page, section);
}
