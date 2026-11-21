import type { NepParams, ResultRef } from "@nodomics/protocol";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { DataPreview } from "./DataPreview.tsx";

const REF: ResultRef = {
  id: "r1",
  rowCount: 250,
  schema: [
    { name: "region", type: "text" },
    { name: "monto", type: "number" },
  ],
};

function renderPreview() {
  const requests: NepParams<"data.page">[] = [];
  const rendered = renderWithEngine(<DataPreview resultRef={REF} />, {
    handlers: {
      "data.page": (params) => {
        requests.push(params);
        return {
          columns: REF.schema,
          rows: [[`Sur-${String(params.offset)}`, 10]],
          total: REF.rowCount,
        };
      },
    },
  });
  return { requests, ...rendered };
}

describe("DataPreview", () => {
  it("shows the first page of the result", async () => {
    const { requests } = renderPreview();

    expect(await screen.findByText("Sur-0")).toBeDefined();
    expect(requests).toEqual([{ ref: "r1", offset: 0, limit: 100 }]);
  });

  it("asks the engine for the next page", async () => {
    const { requests } = renderPreview();
    await screen.findByText("Sur-0");

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText("Sur-100")).toBeDefined();
    expect(requests.at(-1)).toMatchObject({ offset: 100 });
  });

  it("asks the engine to sort by a column", async () => {
    const { requests } = renderPreview();
    await screen.findByText("Sur-0");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "monto");

    await screen.findByRole("columnheader", { name: /monto/ });
    expect(requests.at(-1)).toMatchObject({ sort: { column: "monto", direction: "asc" } });
  });
});
