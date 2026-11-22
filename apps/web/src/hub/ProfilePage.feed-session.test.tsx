import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MINIMAL_CARD } from "../feed/feed-fixtures.ts";
import { editCard, startNewCard, textbox, wizardIsOpen } from "./profile-wizard-fixtures.tsx";

const VISITOR_EMPTY = "@ana todavía no completó su perfil de colaboración.";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function editAsAna() {
  const rendered = await editCard(MINIMAL_CARD);
  await rendered.user.clear(textbox("Sobre ti"));
  await rendered.user.type(textbox("Sobre ti"), "Borrador de Ana");
  return rendered;
}

const editButton = () => screen.queryByRole("button", { name: "Editar perfil" });

describe("ProfilePage wizard when the session changes", () => {
  it("closes the wizard and shows the read-only card on sign-out", async () => {
    const { hub, saveProfile } = await editAsAna();

    await act(async () => {
      await hub.signOut();
    });

    expect(await screen.findByText(MINIMAL_CARD.about)).toBeTruthy();
    expect({
      open: wizardIsOpen(),
      editButton: editButton() !== null,
      saved: saveProfile.mock.calls.length,
    }).toEqual({ open: false, editButton: false, saved: 0 });
  });

  it("closes the wizard and hides Editar perfil when another user signs in", async () => {
    const { hub } = await editAsAna();

    await act(async () => {
      await hub.signOut();
      await hub.signIn({ kind: "email", email: "beto" });
    });

    expect(await screen.findByText(MINIMAL_CARD.about)).toBeTruthy();
    expect({ open: wizardIsOpen(), editButton: editButton() !== null }).toEqual({
      open: false,
      editButton: false,
    });
  });

  it("starts with the wizard closed when Ana signs back in", async () => {
    const { hub } = await editAsAna();

    await act(async () => {
      await hub.signOut();
      await hub.signIn({ kind: "email", email: "ana" });
    });

    expect(await screen.findByRole("button", { name: "Editar perfil" })).toBeTruthy();
    expect(wizardIsOpen()).toBe(false);
    expect(screen.queryByDisplayValue("Borrador de Ana")).toBeNull();
  });

  it("closes a new-card wizard on sign-out and shows the visitor message", async () => {
    const { hub } = await startNewCard();

    await act(async () => {
      await hub.signOut();
    });

    expect(await screen.findByText(VISITOR_EMPTY)).toBeTruthy();
    expect(wizardIsOpen()).toBe(false);
  });
});
