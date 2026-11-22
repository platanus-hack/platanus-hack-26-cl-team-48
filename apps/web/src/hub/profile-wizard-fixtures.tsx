import type { ProfileCard } from "@nodomics/profile";
import { ok } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { FeedContext } from "../feed/feed-context.ts";
import { createFakeFeed } from "../feed/feed-fixtures.ts";
import type { FeedResult, FeedService } from "../feed/feed-service.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

export const WIZARD_NAME = "Arma tu perfil";

/** Renders Ana's own profile page, signed in as Ana; by default she has no card yet. */
export async function renderOwnProfile(overrides: Partial<FeedService> = {}) {
  const user = userEvent.setup();
  const fake = createFakeFeed(overrides);
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: "ana" });
  renderWithHub(
    <FeedContext.Provider value={fake.feed}>
      <ProfilePage handle="ana" />
    </FeedContext.Provider>,
    hub,
  );
  return { user, hub, ...fake };
}

/** Opens the wizard for a person without a card: it starts at step 0. */
export async function startNewCard(overrides: Partial<FeedService> = {}) {
  const rendered = await renderOwnProfile(overrides);
  await rendered.user.click(await screen.findByRole("button", { name: "Armar mi perfil" }));
  await screen.findByRole("form", { name: WIZARD_NAME });
  return rendered;
}

/** Opens the wizard on an existing card through Editar perfil: it starts at step 1. */
export async function editCard(card: ProfileCard, overrides: Partial<FeedService> = {}) {
  const rendered = await renderOwnProfile({ card: () => Promise.resolve(ok(card)), ...overrides });
  await rendered.user.click(await screen.findByRole("button", { name: "Editar perfil" }));
  await screen.findByRole("form", { name: WIZARD_NAME });
  return rendered;
}

export const wizard = () => screen.getByRole("form", { name: WIZARD_NAME });

export const wizardIsOpen = () => screen.queryByRole("form", { name: WIZARD_NAME }) !== null;

export async function clickInWizard(user: UserEvent, name: string): Promise<void> {
  await user.click(within(wizard()).getByRole("button", { name }));
}

export async function clickNext(user: UserEvent, times = 1): Promise<void> {
  for (let step = 0; step < times; step += 1) await clickInWizard(user, "Siguiente");
}

export const textbox = (name: string) =>
  within(wizard()).getByRole<HTMLInputElement | HTMLTextAreaElement>("textbox", { name });

export const isButtonDisabled = (name: string) =>
  within(wizard()).getByRole<HTMLButtonElement>("button", { name }).disabled;

/** A feed answer the test resolves by hand, to observe the page while it waits. */
export function deferred<T>() {
  let resolve: (value: FeedResult<T>) => void = () => undefined;
  const promise = new Promise<FeedResult<T>>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
