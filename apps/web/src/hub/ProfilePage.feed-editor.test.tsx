import { err, ok } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { Result } from "@nodomics/protocol";
import type { ProfileCard } from "@nodomics/profile";
import { FeedContext } from "../feed/feed-context.ts";
import { ANA_CARD, MINIMAL_CARD, createFakeFeed } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function openEditor(overrides: Partial<FeedService> = {}) {
  const user = userEvent.setup();
  const fake = createFakeFeed({
    card: () => Promise.resolve(ok(MINIMAL_CARD)),
    ...overrides,
  });
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: "ana" });
  renderWithHub(
    <FeedContext.Provider value={fake.feed}>
      <ProfilePage handle="ana" />
    </FeedContext.Provider>,
    hub,
  );
  await user.click(await screen.findByRole("button", { name: "Editar perfil" }));
  const form = await screen.findByRole("form", { name: "Editar perfil de colaboración" });
  return { user, form, ...fake };
}

describe("ProfilePage editor", () => {
  it("saves a card built from the fields", async () => {
    const { user, form, saveProfile } = await openEditor();

    await user.clear(within(form).getByLabelText("Sobre ti"));
    await user.type(within(form).getByLabelText("Sobre ti"), "Hola mundo");
    await user.click(within(form).getByRole("radio", { name: "Programa nodos" }));
    await user.click(within(form).getByRole("button", { name: "Agregar dominio" }));
    await user.type(within(form).getByLabelText("Dominio"), "estadística");
    await user.selectOptions(within(form).getByLabelText("Profundidad"), "Experto");
    await user.type(within(form).getByLabelText("Ofrezco"), "modelos{Enter}{Enter}datos");
    await user.type(within(form).getByLabelText("Busco"), "colaboradores");
    await user.type(within(form).getByLabelText("GitHub"), "https://github.com/ana");
    await user.click(within(form).getByRole("button", { name: "Guardar" }));

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

  it("shows the saved card and leaves edit mode on success", async () => {
    const { user, form } = await openEditor({
      saveProfile: () => Promise.resolve(ok(ANA_CARD)),
    });

    await user.click(within(form).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(ANA_CARD.about)).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Editar perfil de colaboración" })).toBeNull();
  });

  it("shows an error notice and stays in the editor on INVALID_CARD", async () => {
    const { user, form } = await openEditor({
      saveProfile: () =>
        Promise.resolve(err({ code: "INVALID_CARD", issues: [{ path: "/about", message: "x" }] })),
    });

    await user.click(within(form).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Revisa los campos marcados.")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Editar perfil de colaboración" })).toBeTruthy();
  });

  it("leaves the editor without saving on Cancelar", async () => {
    const { user, form, saveProfile } = await openEditor();

    await user.click(within(form).getByRole("button", { name: "Cancelar" }));

    expect({
      editing: screen.queryByRole("form", { name: "Editar perfil de colaboración" }) !== null,
      saved: saveProfile.mock.calls.length,
    }).toEqual({ editing: false, saved: 0 });
  });
});

describe("ProfilePage registration", () => {
  it("disables Generar ficha while no source is filled", async () => {
    const { form } = await openEditor();

    const button = within(form).getByRole<HTMLButtonElement>("button", { name: "Generar ficha" });

    expect(button.disabled).toBe(true);
  });

  it("sends only the filled sources", async () => {
    const { user, form, extractProfile } = await openEditor();

    await user.type(within(form).getByLabelText("O pega tu CV"), "mi cv");
    await user.click(within(form).getByRole("button", { name: "Generar ficha" }));

    await waitFor(() => {
      expect(extractProfile).toHaveBeenCalledWith({ text: "mi cv" });
    });
  });

  it("sends the GitHub login when filled", async () => {
    const { user, form, extractProfile } = await openEditor();

    await user.type(within(form).getByLabelText("Usuario de GitHub"), "ana-dev");
    await user.click(within(form).getByRole("button", { name: "Generar ficha" }));

    await waitFor(() => {
      expect(extractProfile).toHaveBeenCalledWith({ githubLogin: "ana-dev" });
    });
  });

  it("sends the PDF as base64", async () => {
    const { user, form, extractProfile } = await openEditor();
    const bytes = new Uint8Array([37, 80, 68, 70, 45]);

    await user.upload(
      within(form).getByLabelText("CV en PDF"),
      new File([bytes], "cv.pdf", { type: "application/pdf" }),
    );
    await user.click(within(form).getByRole("button", { name: "Generar ficha" }));

    await waitFor(() => {
      expect(extractProfile).toHaveBeenCalledWith({ pdfBase64: btoa("%PDF-") });
    });
  });

  it("fills the editor with the extracted card without saving", async () => {
    const { user, form, saveProfile } = await openEditor({
      extractProfile: () => Promise.resolve(ok(ANA_CARD)),
    });

    await user.type(within(form).getByLabelText("O pega tu CV"), "mi cv");
    await user.click(within(form).getByRole("button", { name: "Generar ficha" }));

    expect(await screen.findByText("Revisa la ficha antes de guardar.")).toBeTruthy();
    expect({
      about: within(form).getByRole<HTMLTextAreaElement>("textbox", { name: "Sobre ti" }).value,
      saved: saveProfile.mock.calls.length,
    }).toEqual({ about: ANA_CARD.about, saved: 0 });
  });

  it.each(["EXTRACTION_FAILED", "UNAVAILABLE"] as const)(
    "shows an error notice on %s",
    async (code) => {
      const { user, form } = await openEditor({
        extractProfile: () => Promise.resolve(err({ code })),
      });

      await user.type(within(form).getByLabelText("O pega tu CV"), "mi cv");
      await user.click(within(form).getByRole("button", { name: "Generar ficha" }));

      expect(
        await screen.findByText("No pudimos generar la ficha. Intenta de nuevo o llénala a mano."),
      ).toBeTruthy();
    },
  );
});

type FeedResult = Result<ProfileCard, { readonly code: "UNAVAILABLE" }>;

function deferred() {
  let resolve: (value: FeedResult) => void = () => undefined;
  const promise = new Promise<FeedResult>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const isDisabled = (form: HTMLElement, name: string) =>
  within(form).getByRole<HTMLButtonElement>("button", { name }).disabled;

describe("ProfilePage editor save and generate exclusion", () => {
  it("disables Guardar while a card is being generated and re-enables it after", async () => {
    const pending = deferred();
    const { user, form } = await openEditor({ extractProfile: () => pending.promise });
    await user.type(within(form).getByLabelText("O pega tu CV"), "mi cv");

    await user.click(within(form).getByRole("button", { name: "Generar ficha" }));
    const during = isDisabled(form, "Guardar");
    await act(async () => {
      pending.resolve(ok(ANA_CARD));
      await pending.promise;
    });

    await waitFor(() => {
      expect({ during, after: isDisabled(form, "Guardar") }).toEqual({
        during: true,
        after: false,
      });
    });
  });

  it("disables Generar ficha while the profile is being saved and re-enables it after", async () => {
    const pending = deferred();
    const { user, form } = await openEditor({ saveProfile: () => pending.promise });
    await user.type(within(form).getByLabelText("O pega tu CV"), "mi cv");

    await user.click(within(form).getByRole("button", { name: "Guardar" }));
    const during = isDisabled(form, "Generar ficha");
    await act(async () => {
      pending.resolve({ ok: false, error: { code: "UNAVAILABLE" } });
      await pending.promise;
    });

    await waitFor(() => {
      expect({ during, after: isDisabled(form, "Generar ficha") }).toEqual({
        during: true,
        after: false,
      });
    });
  });
});
