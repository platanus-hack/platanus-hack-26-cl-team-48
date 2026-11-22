import type { ProfileCard } from "@nodomics/profile";
import { err, ok } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ANA_CARD, MINIMAL_CARD } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import {
  clickInWizard,
  clickNext,
  deferred,
  editCard,
  isButtonDisabled,
  startNewCard,
  textbox,
  wizard,
  wizardIsOpen,
} from "./profile-wizard-fixtures.tsx";

const SAVE = "Guardar perfil";
const INVALID_TITLE = "No pudimos guardar tu perfil. Revisa estos datos:";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function saveMinimalCard(overrides: Partial<FeedService> = {}) {
  const rendered = await editCard(MINIMAL_CARD, overrides);
  await clickNext(rendered.user, 3);
  await clickInWizard(rendered.user, SAVE);
  return rendered;
}

describe("ProfilePage wizard save", () => {
  it("saves a card built from every step of the draft", async () => {
    const { user, saveProfile } = await startNewCard();
    await clickInWizard(user, "Lo escribo yo");
    await user.type(textbox("Sobre ti"), "  Hola mundo  ");
    await user.click(within(wizard()).getByRole("radio", { name: "Programo nodos nuevos" }));
    await clickNext(user);
    await user.type(textbox("Puedo ayudar con"), "modelos{Enter}datos,");
    await user.type(textbox("Temas que conoces"), "estadística{Enter}");
    await user.click(
      within(within(wizard()).getByRole("radiogroup", { name: "Nivel en estadística" })).getByRole(
        "radio",
        { name: "Soy experto/a" },
      ),
    );
    await clickNext(user);
    await user.type(textbox("Busco"), "colaboradores{Enter}");
    await user.type(textbox("GitHub"), "https://github.com/ana");
    await clickNext(user);

    await clickInWizard(user, SAVE);

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        schemaVersion: 1,
        about: "Hola mundo",
        technical: "codes",
        domains: [{ name: "estadística", depth: "expert" }],
        offers: ["modelos", "datos"],
        seeks: ["colaboradores"],
        links: { github: "https://github.com/ana" },
      });
    });
  });

  it("saves an unchanged existing card as it was", async () => {
    const { saveProfile } = await saveMinimalCard();

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(MINIMAL_CARD);
    });
  });

  it("sends only the links that are filled", async () => {
    const { user, saveProfile } = await editCard(MINIMAL_CARD);
    await clickNext(user, 2);
    await user.type(textbox("LinkedIn"), "   ");
    await user.type(textbox("Sitio web"), "https://ana.example.com");
    await clickNext(user);

    await clickInWizard(user, SAVE);

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        ...MINIMAL_CARD,
        links: { website: "https://ana.example.com" },
      });
    });
  });

  it("closes the wizard and shows the saved card on success", async () => {
    await saveMinimalCard({ saveProfile: () => Promise.resolve(ok(ANA_CARD)) });

    expect(await screen.findByText(ANA_CARD.about)).toBeTruthy();
    expect(wizardIsOpen()).toBe(false);
  });

  it("asks to review the fields and stays in the wizard on INVALID_CARD", async () => {
    await saveMinimalCard({
      saveProfile: () =>
        Promise.resolve(err({ code: "INVALID_CARD", issues: [{ path: "/about", message: "x" }] })),
    });

    expect(await screen.findByText(INVALID_TITLE)).toBeTruthy();
    expect(wizardIsOpen()).toBe(true);
  });

  it("asks to try again on any other failure", async () => {
    await saveMinimalCard({ saveProfile: () => Promise.resolve(err({ code: "UNAVAILABLE" })) });

    expect(await screen.findByText("No pudimos guardar tu perfil. Intenta de nuevo.")).toBeTruthy();
    expect(wizardIsOpen()).toBe(true);
  });

  it("disables Guardar perfil while saving", async () => {
    const pending = deferred<ProfileCard>();

    await saveMinimalCard({ saveProfile: () => pending.promise });

    await waitFor(() => {
      expect(isButtonDisabled(SAVE)).toBe(true);
    });
    await act(async () => {
      pending.resolve(err({ code: "UNAVAILABLE" }));
      await pending.promise;
    });
  });
});

describe("ProfilePage wizard while saving", () => {
  it("disables Cancelar and Volver a editar until the save ends", async () => {
    const pending = deferred<ProfileCard>();

    await saveMinimalCard({ saveProfile: () => pending.promise });

    await waitFor(() => {
      expect({
        cancel: isButtonDisabled("Cancelar"),
        backToEdit: isButtonDisabled("Volver a editar"),
      }).toEqual({ cancel: true, backToEdit: true });
    });
    await act(async () => {
      pending.resolve(err({ code: "UNAVAILABLE" }));
      await pending.promise;
    });
  });
});

describe("ProfilePage wizard preview", () => {
  it("shows the handle of the person", async () => {
    const { user } = await editCard(ANA_CARD);

    await clickNext(user, 3);

    expect(within(wizard()).getByText("@ana")).toBeTruthy();
  });
});

const INVALID_ISSUES = [
  { path: "/about", message: "must NOT have more than 600 characters" },
  { path: "/links/github", message: "must match format uri" },
];

/** The title and its detail live in one notice: an alert or status region, else the title's parent. */
async function invalidCardNotice(issues?: typeof INVALID_ISSUES): Promise<string> {
  await saveMinimalCard({
    saveProfile: () =>
      Promise.resolve(
        err(issues === undefined ? { code: "INVALID_CARD" } : { code: "INVALID_CARD", issues }),
      ),
  });
  const title = await within(wizard()).findByText(INVALID_TITLE);
  const notice = title.closest('[role="alert"], [role="status"]') ?? title.parentElement;
  return notice?.textContent ?? "";
}

describe("ProfilePage wizard INVALID_CARD detail", () => {
  it("names the fields with their friendly labels", async () => {
    const text = await invalidCardNotice(INVALID_ISSUES);

    expect({ about: text.includes("Sobre ti"), github: text.includes("GitHub") }).toEqual({
      about: true,
      github: true,
    });
  });

  it("does not show the raw card paths", async () => {
    const text = await invalidCardNotice(INVALID_ISSUES);

    expect({ about: text.includes("/about"), github: text.includes("/links/github") }).toEqual({
      about: false,
      github: false,
    });
  });

  it("asks to review the data when there are no issues", async () => {
    const text = await invalidCardNotice();

    expect(text).toContain("Revisa tus datos e intenta de nuevo.");
  });
});
