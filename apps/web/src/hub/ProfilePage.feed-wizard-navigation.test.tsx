import { waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ANA_CARD } from "../feed/feed-fixtures.ts";
import {
  clickInWizard,
  clickNext,
  editCard,
  startNewCard,
  textbox,
  wizard,
} from "./profile-wizard-fixtures.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function expectFocusOnHeading(name: string): Promise<void> {
  await waitFor(() => {
    expect(document.activeElement).toBe(within(wizard()).getByRole("heading", { name }));
  });
}

async function writeItMyself() {
  const rendered = await startNewCard();
  await clickInWizard(rendered.user, "Lo escribo yo");
  return rendered;
}

describe("ProfilePage wizard draft", () => {
  it("keeps the draft after going back to step 0 and writing again", async () => {
    const { user } = await writeItMyself();
    await user.type(textbox("Sobre ti"), "Hola mundo");

    await clickInWizard(user, "Atrás");
    await clickInWizard(user, "Lo escribo yo");

    expect(textbox("Sobre ti").value).toBe("Hola mundo");
  });
});

describe("ProfilePage wizard focus", () => {
  it("focuses the step 0 heading when opened with Armar mi perfil", async () => {
    await startNewCard();

    await expectFocusOnHeading("¿Cómo quieres empezar?");
  });

  it("focuses the step 1 heading when opened with Editar perfil", async () => {
    await editCard(ANA_CARD);

    await expectFocusOnHeading("Cuéntanos de ti");
  });

  it("focuses the step 1 heading after Lo escribo yo", async () => {
    await writeItMyself();

    await expectFocusOnHeading("Cuéntanos de ti");
  });

  it("focuses the CV screen heading after Sube tu CV y lo armamos por ti", async () => {
    const { user } = await startNewCard();

    await clickInWizard(user, "Sube tu CV y lo armamos por ti");

    await waitFor(() => {
      expect({
        isHeading: within(wizard())
          .getAllByRole("heading")
          .some((heading) => heading === document.activeElement),
        isStartHeading:
          within(wizard()).queryByRole("heading", { name: "¿Cómo quieres empezar?" }) ===
          document.activeElement,
      }).toEqual({ isHeading: true, isStartHeading: false });
    });
  });

  it.each([
    [1, "¿En qué puedes ayudar?"],
    [2, "¿Qué estás buscando?"],
    [3, "Así te verán"],
  ] as const)(
    "focuses the next heading after Siguiente pressed %i time(s)",
    async (times, name) => {
      const { user } = await writeItMyself();

      await clickNext(user, times);

      await expectFocusOnHeading(name);
    },
  );

  it("focuses the previous heading after Atrás", async () => {
    const { user } = await writeItMyself();
    await clickNext(user);

    await clickInWizard(user, "Atrás");

    await expectFocusOnHeading("Cuéntanos de ti");
  });

  it("focuses the step 0 heading after Atrás from step 1 of a new card", async () => {
    const { user } = await writeItMyself();

    await clickInWizard(user, "Atrás");

    await expectFocusOnHeading("¿Cómo quieres empezar?");
  });

  it("focuses the step 3 heading after Volver a editar", async () => {
    const { user } = await writeItMyself();
    await clickNext(user, 3);

    await clickInWizard(user, "Volver a editar");

    await expectFocusOnHeading("¿Qué estás buscando?");
  });
});
