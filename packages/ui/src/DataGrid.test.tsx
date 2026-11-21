import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataGrid } from "./DataGrid.tsx";

const COLUMNS = [
  { name: "region", type: "text", pinned: true },
  { name: "monto", type: "number", sorted: "desc" },
  { name: "activo", type: "bool" },
] as const;

function bodyRows(): ReadonlyArray<HTMLElement> {
  return screen.getAllByRole("row").slice(1);
}

describe("DataGrid", () => {
  it("heads each column with its name and type", () => {
    render(<DataGrid columns={COLUMNS} rows={[]} />);

    const header = screen.getByRole("columnheader", { name: /monto/ });
    expect(header.textContent).toContain("número");
    expect(header.getAttribute("aria-sort")).toBe("descending");
  });

  it("numbers rows from the page offset", () => {
    render(<DataGrid columns={COLUMNS} rows={[["Sur", 1, true]]} offset={100} />);

    expect(within(bodyRows()[0] ?? document.body).getAllByRole("cell")[0]?.textContent).toBe("101");
  });

  it("formats values by column type", () => {
    render(
      <DataGrid
        columns={COLUMNS}
        rows={[
          ["Sur", 1250000, true],
          [null, 3, false],
        ]}
      />,
    );

    expect(screen.getByText("1.250.000")).toBeTruthy();
    expect(screen.getByText("verdadero")).toBeTruthy();
    expect(screen.getByText("falso")).toBeTruthy();
    expect(screen.getByText("nulo")).toBeTruthy();
  });

  it("explains a cell that failed", () => {
    render(
      <DataGrid
        columns={COLUMNS}
        rows={[["Sur", { error: "No es un número", value: "abc" }, true]]}
      />,
    );

    expect(screen.getByTitle("No es un número").textContent).toBe("abc");
  });

  it("signs added and removed rows instead of numbering them", () => {
    render(
      <DataGrid
        columns={COLUMNS}
        rows={[
          { cells: ["Norte", 5, true], __diff: "added" },
          { cells: ["Sur", 7, false], __diff: "removed" },
        ]}
      />,
    );

    expect(bodyRows().map((row) => row.firstElementChild?.textContent)).toEqual(["+", "−"]);
  });

  it("summarizes how much of the result is shown", () => {
    render(<DataGrid columns={COLUMNS} rows={[["a", 1, true]]} total={31207} engine="browser" />);

    expect(screen.getByText(/Mostrando/).textContent).toBe(
      "Mostrando 1 de 31.207 filas · 3 columnas",
    );
    expect(screen.getByText("Navegador")).toBeTruthy();
  });

  it("marks the selected row and reports a newly selected one", async () => {
    const onRowSelect = vi.fn();
    render(
      <DataGrid
        columns={COLUMNS}
        rows={[
          ["a", 1, true],
          ["b", 2, false],
        ]}
        selectedRow={0}
        onRowSelect={onRowSelect}
      />,
    );

    await userEvent.click(screen.getByText("b"));

    expect(bodyRows()[0]?.getAttribute("aria-selected")).toBe("true");
    expect(onRowSelect).toHaveBeenCalledWith(1);
  });
  it("focuses selectable rows and selects with Enter and Space", async () => {
    const selections: number[] = [];
    render(
      <DataGrid
        columns={COLUMNS}
        rows={[["a"], ["b"]]}
        selectedRow={0}
        onRowSelect={(index) => selections.push(index)}
      />,
    );
    await userEvent.tab();
    expect(document.activeElement).toBe(bodyRows()[0]);
    expect(bodyRows()[1]?.getAttribute("aria-selected")).toBe("false");
    await userEvent.keyboard("{Enter} ");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(selections).toEqual([0, 0, 1]);
  });

  it("keeps rows without selection callbacks out of the tab order", async () => {
    render(<DataGrid columns={COLUMNS} rows={[["a"]]} />);
    await userEvent.tab();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("DataGrid inline variant", () => {
  it("heads each column on one line, naming its type only for assistive technology", () => {
    render(<DataGrid variant="inline" columns={COLUMNS} rows={[["Sur", 1, true]]} />);

    const header = screen.getByRole("columnheader", { name: /monto/ });
    expect(header.textContent).toBe("monto");
    expect(within(header).getByTitle("Número")).toBeDefined();
    expect(header.closest(".nd-grid")?.classList.contains("nd-grid-inline")).toBe(true);
  });

  it("keeps the full column name at hand when a narrow column cuts it short", () => {
    render(<DataGrid variant="inline" columns={COLUMNS} rows={[["Sur", 1, true]]} />);

    const header = screen.getByRole("columnheader", { name: /region/ });
    expect(within(header).getByTitle("region").textContent).toBe("region");
  });

  it("leaves the row count to the surrounding panel", () => {
    render(<DataGrid variant="inline" columns={COLUMNS} rows={[["Sur", 1, true]]} />);

    expect(screen.queryByText(/Mostrando/)).toBeNull();
  });
});
