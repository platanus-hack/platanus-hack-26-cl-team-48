import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Node } from "./Node.tsx";

const PORTS = {
  inputs: [{ name: "datos", type: "table", connected: true }],
  outputs: [{ name: "filtrado", type: "table" }],
} as const;

describe("Node", () => {
  it("is a focusable group named by its title and execution state", () => {
    render(<Node title="Filtrar filas" state="done" />);

    const node = screen.getByRole("group", { name: "Filtrar filas, Listo" });
    expect(node.tabIndex).toBe(0);
  });

  it("shows its ports", () => {
    render(<Node title="Filtrar filas" {...PORTS} />);

    expect(screen.getByText("datos")).toBeTruthy();
    expect(screen.getByText("filtrado")).toBeTruthy();
  });

  it("shows where a source reads from and never shows inputs", () => {
    render(<Node variant="source" title="Ventas" origin="ventas.csv" {...PORTS} />);

    expect(screen.getByText("ventas.csv")).toBeTruthy();
    expect(screen.queryByText("datos")).toBeNull();
  });

  it("shows summary, thumbnail and dimensions up close", () => {
    render(
      <Node
        title="Agrupar"
        summary="suma de monto por mes"
        thumbnail={<span>miniatura</span>}
        rows={31207}
        cols={4}
        originalTitle="Group by"
      />,
    );

    expect(screen.getByText("suma de monto por mes")).toBeTruthy();
    expect(screen.getByText("miniatura")).toBeTruthy();
    expect(screen.getByText("31.207 filas · 4 col.")).toBeTruthy();
    expect(screen.getByText("Group by")).toBeTruthy();
  });

  it("drops the details at mid zoom", () => {
    render(<Node title="Agrupar" zoom="mid" summary="suma" rows={10} cols={2} />);

    expect(screen.getByText("Agrupar")).toBeTruthy();
    expect(screen.queryByText("suma")).toBeNull();
    expect(screen.queryByText("10 filas · 2 col.")).toBeNull();
  });

  it("keeps only icon and state at far zoom", () => {
    render(<Node title="Agrupar" zoom="far" state="error" {...PORTS} />);

    expect(screen.queryByText("Agrupar")).toBeNull();
    expect(screen.queryByText("datos")).toBeNull();
    expect(screen.getByRole("status", { name: "Error" })).toBeTruthy();
  });

  it("explains an error up close", () => {
    render(<Node title="Agrupar" state="error" errorMessage="No existe la columna monto" />);

    expect(screen.getByText("No existe la columna monto")).toBeTruthy();
  });

  it("shows the progress of a running node", () => {
    render(<Node title="Agrupar" state="running" progress={0.4} />);

    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");
  });

  it("shows two conditions up close and counts the rest", () => {
    render(<Node title="Agrupar" conditions={["warning", "credential", "update", "deprecated"]} />);

    expect(screen.getByRole("status", { name: "Advertencia" })).toBeTruthy();
    expect(screen.getByRole("status", { name: "Requiere credencial" })).toBeTruthy();
    expect(screen.getByText("+2").getAttribute("title")).toBe("Actualización disponible, Obsoleto");
  });

  it("shows one condition at mid zoom", () => {
    render(<Node title="Agrupar" zoom="mid" conditions={["warning", "credential"]} />);

    expect(screen.queryByRole("status", { name: "Requiere credencial" })).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("shows comments, engine and origin in its footer", () => {
    render(<Node title="Agrupar" comments={3} engine="cloud" from="hub" />);

    expect(screen.getByTitle("3 comentarios")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Nube" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Comunitario" })).toBeTruthy();
  });

  it("tags a node proposed by the AI and a collaborator's selection", () => {
    render(<Node title="Agrupar" pending collaborator={{ name: "Ana", color: 2 }} />);

    expect(screen.getByText("Propuesto")).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
  });

  it("describes what it contains", () => {
    render(
      <>
        <Node variant="subflow" title="Limpieza" innerCount={12} />
        <Node variant="code" title="Script" language="Python" />
      </>,
    );

    expect(screen.getByTitle("Contiene un flujo").textContent).toBe("12");
    expect(screen.getByText("Python")).toBeTruthy();
  });

  it("offers quick actions when selected and reports the chosen one", async () => {
    const onAction = vi.fn();
    render(<Node title="Agrupar" selected conditions={["disabled"]} onAction={onAction} />);
    const toolbar = screen.getByRole("toolbar", { name: "Acciones del nodo" });

    await userEvent.click(screen.getByRole("button", { name: "Ejecutar hasta aquí" }));
    await userEvent.click(screen.getByRole("button", { name: "Activar" }));

    expect(toolbar.querySelectorAll("button")).toHaveLength(4);
    expect(onAction).toHaveBeenNthCalledWith(1, "run");
    expect(onAction).toHaveBeenNthCalledWith(2, "toggle-disabled");
  });

  it("hides quick actions when not selected or when asked", () => {
    render(
      <>
        <Node title="A" />
        <Node title="B" selected showActions={false} />
      </>,
    );

    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
