import { ok } from "@nodomics/protocol";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { MINIMAL_CARD, createFakeFeed } from "../feed/feed-fixtures.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

const EDITOR_NAME = "Editar perfil de colaboración";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function editAsAna() {
  const user = userEvent.setup();
  const { feed, saveProfile } = createFakeFeed({
    card: () => Promise.resolve(ok(MINIMAL_CARD)),
  });
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: "ana" });
  renderWithHub(
    <FeedContext.Provider value={feed}>
      <ProfilePage handle="ana" />
    </FeedContext.Provider>,
    hub,
  );
  await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
  const form = await screen.findByRole("form", { name: EDITOR_NAME });
  await user.clear(within(form).getByLabelText("Sobre ti"));
  await user.type(within(form).getByLabelText("Sobre ti"), "Borrador de Ana");
  return { user, hub, saveProfile };
}

const editorIsOpen = () => screen.queryByRole("form", { name: EDITOR_NAME }) !== null;
const editButton = () => screen.queryByRole("button", { name: "Editar perfil" });

describe("ProfilePage editor when the session changes", () => {
  it("closes the editor and shows the read-only card on sign-out", async () => {
    const { hub, saveProfile } = await editAsAna();

    await act(async () => {
      await hub.signOut();
    });

    expect(await screen.findByText(MINIMAL_CARD.about)).toBeTruthy();
    expect({
      editing: editorIsOpen(),
      editButton: editButton() !== null,
      saved: saveProfile.mock.calls.length,
    }).toEqual({ editing: false, editButton: false, saved: 0 });
  });

  it("closes the editor and hides Editar perfil when another user signs in", async () => {
    const { hub } = await editAsAna();

    await act(async () => {
      await hub.signOut();
      await hub.signIn({ kind: "email", email: "beto" });
    });

    expect(await screen.findByText(MINIMAL_CARD.about)).toBeTruthy();
    expect({ editing: editorIsOpen(), editButton: editButton() !== null }).toEqual({
      editing: false,
      editButton: false,
    });
  });

  it("starts with the editor closed when Ana signs back in", async () => {
    const { hub } = await editAsAna();

    await act(async () => {
      await hub.signOut();
      await hub.signIn({ kind: "email", email: "ana" });
    });

    expect(await screen.findByRole("button", { name: "Editar perfil" })).toBeTruthy();
    expect(editorIsOpen()).toBe(false);
    expect(screen.queryByDisplayValue("Borrador de Ana")).toBeNull();
  });
});
