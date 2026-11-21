import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ChartExport } from "./ChartExport.tsx";

it("keeps exports closed until requested and downloads both Vega image formats", async () => {
  const formats: string[] = [];
  const downloads: string[] = [];
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
  render(
    <ChartExport
      view={{
        toImageURL: (format) => {
          formats.push(format);
          return Promise.resolve(`data:image/${format};base64,AA==`);
        },
      }}
    />,
  );
  expect(screen.queryByRole("menu")).toBeNull();

  for (const format of ["svg", "png"]) {
    await userEvent.click(screen.getByRole("button", { name: "Exportar gráfico" }));
    await userEvent.click(
      screen.getByRole("menuitem", { name: `Guardar como ${format.toUpperCase()}` }),
    );
    await waitFor(() => {
      expect(downloads).toContain(`grafico.${format}`);
    });
    expect(screen.queryByRole("menu")).toBeNull();
  }
  expect(formats).toEqual(["svg", "png"]);
  click.mockRestore();
});
