import { waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MINIMAL_CARD } from "../feed/feed-fixtures.ts";
import {
  clickInWizard,
  clickNext,
  editCard,
  isButtonDisabled,
  pasteInto,
  textbox,
  wizard,
} from "./profile-wizard-fixtures.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

/** Edits the minimal card, types one link on step 3 and stops at the step-4 preview. */
async function previewWithLink(field: string, typed: string) {
  const rendered = await editCard(MINIMAL_CARD);
  await clickNext(rendered.user, 2);
  await pasteInto(rendered.user, textbox(field), typed);
  await clickNext(rendered.user);
  return rendered;
}

describe("ProfilePage wizard links without a scheme", () => {
  it("saves a link typed without a scheme as https", async () => {
    const { user, saveProfile } = await previewWithLink("GitHub", "github.com/ana");

    await clickInWizard(user, "Guardar perfil");

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        ...MINIMAL_CARD,
        links: { github: "https://github.com/ana" },
      });
    });
  });

  it("previews a link typed without a scheme as https", async () => {
    await previewWithLink("GitHub", "github.com/ana");

    const link = within(wizard()).getByRole("link", { name: "GitHub" });

    expect(link.getAttribute("href")).toBe("https://github.com/ana");
  });

  it("keeps a link that already starts with https", async () => {
    const { user, saveProfile } = await previewWithLink("Sitio web", "https://ana.example.com");

    await clickInWizard(user, "Guardar perfil");

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        ...MINIMAL_CARD,
        links: { website: "https://ana.example.com" },
      });
    });
  });

  it("saves an http link as https", async () => {
    const { user, saveProfile } = await previewWithLink("Sitio web", "http://ana.example.com");

    await clickInWizard(user, "Guardar perfil");

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        ...MINIMAL_CARD,
        links: { website: "https://ana.example.com" },
      });
    });
  });

  it("previews an http link as https", async () => {
    await previewWithLink("Sitio web", "http://ana.example.com");

    const link = within(wizard()).getByRole("link", { name: "Sitio web" });

    expect(link.getAttribute("href")).toBe("https://ana.example.com");
  });

  it("drops a whitespace-only link", async () => {
    const { user, saveProfile } = await previewWithLink("LinkedIn", "   ");

    await clickInWizard(user, "Guardar perfil");

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(MINIMAL_CARD);
    });
  });
});

const LINK_ERROR = "Revisa este enlace. Por ejemplo: github.com/tu-usuario";

/** Edits the minimal card and types one link on step 3, leaving the field afterwards. */
async function typeLinkOnStep3(field: string, typed: string) {
  const rendered = await editCard(MINIMAL_CARD);
  await clickNext(rendered.user, 2);
  await pasteInto(rendered.user, textbox(field), typed);
  await rendered.user.tab();
  return rendered;
}

describe("ProfilePage wizard links that are not web addresses", () => {
  it.each(["no tengo", "ana"])("shows the link error for %j", async (typed) => {
    await typeLinkOnStep3("GitHub", typed);

    const error = await within(wizard()).findByText(LINK_ERROR);

    expect(error).toBeTruthy();
  });

  it.each(["no tengo", "ana"])("disables Siguiente for %j", async (typed) => {
    await typeLinkOnStep3("GitHub", typed);

    const disabled = isButtonDisabled("Siguiente");

    expect(disabled).toBe(true);
  });

  it("clears the error and enables Siguiente when the field is emptied", async () => {
    const { user } = await typeLinkOnStep3("GitHub", "no tengo");
    await within(wizard()).findByText(LINK_ERROR);

    await user.clear(textbox("GitHub"));

    await waitFor(() => {
      expect({
        error: within(wizard()).queryByText(LINK_ERROR) !== null,
        disabled: isButtonDisabled("Siguiente"),
      }).toEqual({ error: false, disabled: false });
    });
  });
});
