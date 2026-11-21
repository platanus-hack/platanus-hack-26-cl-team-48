import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HubCard } from "./HubCard.tsx";

describe("HubCard", () => {
  it("presents the item as an article headed by its title", () => {
    render(<HubCard kind="node" title="Filtrar filas" author="Nodomics" />);

    expect(screen.getByRole("article")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Filtrar filas" })).toBeTruthy();
  });

  it("shows kind, version, author, trust and description", () => {
    render(
      <HubCard
        kind="package"
        title="Geo"
        author="Ana"
        trust="verified"
        version="1.2.0"
        description="Nodos geográficos"
      />,
    );

    expect(screen.getByText("Paquete")).toBeTruthy();
    expect(screen.getByText("1.2.0")).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Verificado")).toBeTruthy();
    expect(screen.getByText("Nodos geográficos")).toBeTruthy();
  });

  it("formats its counters in the user's region format", () => {
    render(<HubCard kind="node" title="X" author="A" stars={1250} uses={31207} forks={3} />);

    expect(screen.getByTitle("Estrellas").textContent).toBe("1.250");
    expect(screen.getByTitle("Usos").textContent).toBe("31.207");
    expect(screen.getByTitle("Forks").textContent).toBe("3");
  });

  it("hides forks when unknown", () => {
    render(<HubCard kind="node" title="X" author="A" />);

    expect(screen.queryByTitle("Forks")).toBeNull();
  });

  it("shows the types it takes and returns", () => {
    render(<HubCard kind="node" title="X" author="A" io={{ in: ["table"], out: ["chart"] }} />);

    expect(screen.getByRole("img", { name: "Tabla" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Gráfico" })).toBeTruthy();
  });

  it("previews flows with a thumbnail", () => {
    render(<HubCard kind="flow" title="X" author="A" thumbnail={<span>vista previa</span>} />);

    expect(screen.getByText("vista previa")).toBeTruthy();
  });
});
