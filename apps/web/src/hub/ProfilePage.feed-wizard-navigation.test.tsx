import type { ProfileCard } from "@nodomics/profile";
import { waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ANA_CARD, MINIMAL_CARD } from "../feed/feed-fixtures.ts";
import {
  clickInWizard,
  clickNext,
  editCard,
  FULL_RUN_TIMEOUT_MS,
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

const TWICE_STATISTICS: ProfileCard = {
  ...MINIMAL_CARD,
  domains: [
    { name: "estadística", depth: "curious" },
    { name: "estadística", depth: "expert" },
  ],
};

async function editTopicsTwice() {
  const rendered = await editCard(TWICE_STATISTICS);
  await clickNext(rendered.user);
  return rendered;
}

const statisticsGroups = () =>
  within(wizard()).queryAllByRole("radiogroup", { name: "Nivel en estadística" });

const isCheckedIn = (group: HTMLElement, name: string) =>
  within(group).getByRole<HTMLInputElement>("radio", { name }).checked;

describe("ProfilePage wizard with repeated topic names", () => {
  it("changes only the level of the topic row that was clicked", async () => {
    const { user } = await editTopicsTwice();
    const [first] = statisticsGroups();
    if (first === undefined) throw new Error("No topic row for estadística");

    await user.click(within(first).getByRole("radio", { name: "Lo practico" }));

    const [firstAfter, secondAfter] = statisticsGroups();
    expect([
      firstAfter !== undefined && isCheckedIn(firstAfter, "Lo practico"),
      secondAfter !== undefined && isCheckedIn(secondAfter, "Soy experto/a"),
    ]).toEqual([true, true]);
  });

  it("removes only the topic row whose Quitar was clicked", async () => {
    const { user } = await editTopicsTwice();

    const [firstRemove] = within(wizard()).getAllByRole("button", { name: "Quitar estadística" });
    if (firstRemove === undefined) throw new Error("No Quitar button for estadística");
    await user.click(firstRemove);

    expect(statisticsGroups()).toHaveLength(1);
  });

  it(
    "saves exactly the remaining topic after removing one",
    async () => {
      const { user, saveProfile } = await editTopicsTwice();
      const [firstRemove] = within(wizard()).getAllByRole("button", { name: "Quitar estadística" });
      if (firstRemove === undefined) throw new Error("No Quitar button for estadística");
      await user.click(firstRemove);
      await clickNext(user, 2);

      await clickInWizard(user, "Guardar perfil");

      await waitFor(() => {
        expect(saveProfile).toHaveBeenCalledWith({
          ...MINIMAL_CARD,
          domains: [{ name: "estadística", depth: "expert" }],
        });
      });
    },
    FULL_RUN_TIMEOUT_MS,
  );
});

describe("ProfilePage wizard with repeated offers", () => {
  it(
    "saves one offer after removing one of two repeated ones",
    async () => {
      const { user, saveProfile } = await editCard({
        ...MINIMAL_CARD,
        offers: ["modelos", "modelos"],
      });
      await clickNext(user);
      const [firstRemove] = within(wizard()).getAllByRole("button", { name: "Quitar modelos" });
      if (firstRemove === undefined) throw new Error("No Quitar button for modelos");
      await user.click(firstRemove);
      await clickNext(user, 2);

      await clickInWizard(user, "Guardar perfil");

      await waitFor(() => {
        expect(saveProfile).toHaveBeenCalledWith({ ...MINIMAL_CARD, offers: ["modelos"] });
      });
    },
    FULL_RUN_TIMEOUT_MS,
  );
});
