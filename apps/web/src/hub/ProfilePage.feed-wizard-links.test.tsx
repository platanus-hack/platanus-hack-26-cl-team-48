import { waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MINIMAL_CARD } from "../feed/feed-fixtures.ts";
import {
  clickInWizard,
  clickNext,
  editCard,
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

  it("keeps a link that already has a scheme", async () => {
    const { user, saveProfile } = await previewWithLink("Sitio web", "http://ana.example.com");

    await clickInWizard(user, "Guardar perfil");

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith({
        ...MINIMAL_CARD,
        links: { website: "http://ana.example.com" },
      });
    });
  });

  it("drops a whitespace-only link", async () => {
    const { user, saveProfile } = await previewWithLink("LinkedIn", "   ");

    await clickInWizard(user, "Guardar perfil");

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(MINIMAL_CARD);
    });
  });
});
