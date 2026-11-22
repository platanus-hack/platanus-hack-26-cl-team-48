import type { ProfileCard } from "@nodomics/profile";
import { err, ok } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ANA_CARD } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import {
  clickInWizard,
  deferred,
  isButtonDisabled,
  startNewCard,
  textbox,
  wizard,
} from "./profile-wizard-fixtures.tsx";

const BUILD = "Armar mi perfil";
const PASTE_LABEL = "¿No tienes PDF? Pega el texto";
const FAILURE_NOTICE = "No pudimos leer tu CV. Intenta de nuevo o llénalo a mano.";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function openCvScreen(overrides: Partial<FeedService> = {}) {
  const rendered = await startNewCard(overrides);
  await clickInWizard(rendered.user, "Sube tu CV y lo armamos por ti");
  return rendered;
}

async function buildFromPastedText(overrides: Partial<FeedService> = {}) {
  const rendered = await openCvScreen(overrides);
  await rendered.user.type(textbox(PASTE_LABEL), "mi cv");
  await clickInWizard(rendered.user, BUILD);
  return rendered;
}

describe("ProfilePage wizard CV screen", () => {
  it("asks for a PDF file", async () => {
    await openCvScreen();

    expect(within(wizard()).getByLabelText("Tu CV en PDF").getAttribute("accept")).toBe(
      "application/pdf",
    );
  });

  it("offers a textarea to paste the CV", async () => {
    await openCvScreen();

    expect(textbox(PASTE_LABEL).tagName).toBe("TEXTAREA");
  });

  it("reveals the GitHub field only on request", async () => {
    const { user } = await openCvScreen();
    const before = within(wizard()).queryByRole("textbox", { name: "Tu usuario de GitHub" });

    await clickInWizard(user, "¿Programas? Agrega tu GitHub");

    expect({
      before: before !== null,
      after: within(wizard()).queryByRole("textbox", { name: "Tu usuario de GitHub" }) !== null,
    }).toEqual({ before: false, after: true });
  });

  it("disables Armar mi perfil while no source is given", async () => {
    await openCvScreen();

    expect(isButtonDisabled(BUILD)).toBe(true);
  });

  it("enables Armar mi perfil once text is pasted", async () => {
    const { user } = await openCvScreen();

    await user.type(textbox(PASTE_LABEL), "mi cv");

    expect(isButtonDisabled(BUILD)).toBe(false);
  });
});

describe("ProfilePage wizard CV extraction", () => {
  it("sends only the pasted text", async () => {
    const { extractProfile } = await buildFromPastedText();

    await waitFor(() => {
      expect(extractProfile).toHaveBeenCalledWith({ text: "mi cv" });
    });
  });

  it("sends only the GitHub login when it is the only source", async () => {
    const { user, extractProfile } = await openCvScreen();
    await clickInWizard(user, "¿Programas? Agrega tu GitHub");
    await user.type(textbox("Tu usuario de GitHub"), "ana-dev");

    await clickInWizard(user, BUILD);

    await waitFor(() => {
      expect(extractProfile).toHaveBeenCalledWith({ githubLogin: "ana-dev" });
    });
  });

  it("sends the PDF as base64", async () => {
    const { user, extractProfile } = await openCvScreen();
    await user.upload(
      within(wizard()).getByLabelText("Tu CV en PDF"),
      new File([new Uint8Array([37, 80, 68, 70, 45])], "cv.pdf", { type: "application/pdf" }),
    );

    await clickInWizard(user, BUILD);

    await waitFor(() => {
      expect(extractProfile).toHaveBeenCalledWith({ pdfBase64: btoa("%PDF-") });
    });
  });

  it("shows a reading notice and disables Armar mi perfil while waiting", async () => {
    const pending = deferred<ProfileCard>();

    await buildFromPastedText({ extractProfile: () => pending.promise });

    expect(await within(wizard()).findByText("Leyendo tu CV… toma unos segundos.")).toBeTruthy();
    expect(isButtonDisabled(BUILD)).toBe(true);
    await act(async () => {
      pending.resolve(ok(ANA_CARD));
      await pending.promise;
    });
  });

  it("goes to step 1 filled with the extracted card", async () => {
    await buildFromPastedText({ extractProfile: () => Promise.resolve(ok(ANA_CARD)) });

    expect(
      await within(wizard()).findByText("Lo armamos con tu CV. Revisa y ajusta lo que quieras."),
    ).toBeTruthy();
    expect({
      step: within(wizard()).queryByText("Paso 1 de 4") !== null,
      about: textbox("Sobre ti").value,
    }).toEqual({ step: true, about: ANA_CARD.about });
  });

  it("saves nothing after extracting", async () => {
    const { saveProfile } = await buildFromPastedText({
      extractProfile: () => Promise.resolve(ok(ANA_CARD)),
    });

    await within(wizard()).findByText("Paso 1 de 4");

    expect(saveProfile).not.toHaveBeenCalled();
  });

  it.each(["EXTRACTION_FAILED", "UNAVAILABLE"] as const)(
    "shows a failure notice on %s",
    async (code) => {
      await buildFromPastedText({ extractProfile: () => Promise.resolve(err({ code })) });

      expect(await screen.findByText(FAILURE_NOTICE)).toBeTruthy();
    },
  );

  it("goes to an empty step 1 on Llenarlo a mano after a failure", async () => {
    const { user } = await buildFromPastedText({
      extractProfile: () => Promise.resolve(err({ code: "EXTRACTION_FAILED" })),
    });
    await screen.findByText(FAILURE_NOTICE);

    await clickInWizard(user, "Llenarlo a mano");

    expect({
      step: within(wizard()).queryByText("Paso 1 de 4") !== null,
      about: textbox("Sobre ti").value,
    }).toEqual({ step: true, about: "" });
  });
});
