import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentMarkdown } from "./AgentMarkdown.tsx";

const textsOf = (elements: readonly HTMLElement[]) =>
  elements.map((element) => element.textContent);

describe("AgentMarkdown blocks", () => {
  it("shows plain text as a paragraph", () => {
    render(<AgentMarkdown text="El flujo agrupa ventas por mes." />);

    expect(screen.getByRole("paragraph").textContent).toBe("El flujo agrupa ventas por mes.");
  });

  it("splits paragraphs on a blank line", () => {
    render(<AgentMarkdown text={"Primero reviso.\n\nDespués propongo."} />);

    expect(textsOf(screen.getAllByRole("paragraph"))).toEqual([
      "Primero reviso.",
      "Después propongo.",
    ]);
  });

  it.each([
    ["# Resumen", 3, "Resumen"],
    ["## Cambios", 4, "Cambios"],
    ["### Detalle", 5, "Detalle"],
  ])("shows %s as a level %i heading", (text, level, name) => {
    render(<AgentMarkdown text={text} />);

    expect(screen.getByRole("heading", { level, name }).textContent).toBe(name);
  });

  it("shows a heading followed by its paragraph", () => {
    render(<AgentMarkdown text={"## Cambios\nSubo el umbral."} />);

    expect({
      heading: screen.getByRole("heading", { level: 4 }).textContent,
      paragraph: screen.getByRole("paragraph").textContent,
    }).toEqual({ heading: "Cambios", paragraph: "Subo el umbral." });
  });

  it.each([
    ["-", "- uno\n- dos\n- tres"],
    ["*", "* uno\n* dos\n* tres"],
  ])("shows lines starting with %s as an unordered list", (_marker, text) => {
    render(<AgentMarkdown text={text} />);

    expect({
      tag: screen.getByRole("list").tagName,
      items: textsOf(screen.getAllByRole("listitem")),
    }).toEqual({ tag: "UL", items: ["uno", "dos", "tres"] });
  });

  it("shows numbered lines as an ordered list", () => {
    render(<AgentMarkdown text={"1. uno\n2. dos"} />);

    expect({
      tag: screen.getByRole("list").tagName,
      items: textsOf(screen.getAllByRole("listitem")),
    }).toEqual({ tag: "OL", items: ["uno", "dos"] });
  });

  it("separates a list from the paragraph before it", () => {
    render(<AgentMarkdown text={"Propongo:\n\n- subir el umbral\n- marcar atípicos"} />);

    expect({
      paragraph: screen.getByRole("paragraph").textContent,
      items: textsOf(screen.getAllByRole("listitem")),
    }).toEqual({ paragraph: "Propongo:", items: ["subir el umbral", "marcar atípicos"] });
  });

  it("shows a fenced block as preformatted code", () => {
    const { container } = render(<AgentMarkdown text={"```\nSELECT *\nFROM ventas\n```"} />);

    expect(container.querySelector("pre > code")?.textContent).toBe("SELECT *\nFROM ventas");
  });

  it("does not interpret markdown inside a fenced block", () => {
    const { container } = render(<AgentMarkdown text={"```\n# no\n**tampoco**\n- ni esto\n```"} />);

    expect({
      code: container.querySelector("pre > code")?.textContent,
      headings: screen.queryAllByRole("heading").length,
      strong: screen.queryAllByRole("strong").length,
      lists: screen.queryAllByRole("list").length,
    }).toEqual({ code: "# no\n**tampoco**\n- ni esto", headings: 0, strong: 0, lists: 0 });
  });

  it("renders nothing for an empty text", () => {
    const { container } = render(<AgentMarkdown text="" />);

    expect(container.textContent).toBe("");
  });
});

describe("AgentMarkdown inline formatting", () => {
  it("shows **text** as strong", () => {
    render(<AgentMarkdown text="Subo el umbral a **3 desvíos**." />);

    expect({
      strong: screen.getByRole("strong").textContent,
      paragraph: screen.getByRole("paragraph").textContent,
    }).toEqual({ strong: "3 desvíos", paragraph: "Subo el umbral a 3 desvíos." });
  });

  it.each([
    ["*", "Es *solo* una idea."],
    ["_", "Es _solo_ una idea."],
  ])("shows text between %s as emphasis", (_marker, text) => {
    render(<AgentMarkdown text={text} />);

    expect({
      emphasis: screen.getByRole("emphasis").textContent,
      paragraph: screen.getByRole("paragraph").textContent,
    }).toEqual({ emphasis: "solo", paragraph: "Es solo una idea." });
  });

  it("shows text between backticks as code", () => {
    render(<AgentMarkdown text="Uso la columna `monto`." />);

    expect({
      code: screen.getByRole("code").textContent,
      paragraph: screen.getByRole("paragraph").textContent,
    }).toEqual({ code: "monto", paragraph: "Uso la columna monto." });
  });

  it("does not interpret markdown inside inline code", () => {
    render(<AgentMarkdown text="Escribe `**x**` tal cual." />);

    expect({
      code: screen.getByRole("code").textContent,
      strong: screen.queryAllByRole("strong").length,
    }).toEqual({ code: "**x**", strong: 0 });
  });

  it("formats text inside list items", () => {
    render(<AgentMarkdown text={"- subir **umbral**\n- usar `monto`"} />);

    expect({
      strong: screen.getByRole("strong").textContent,
      code: screen.getByRole("code").textContent,
      items: textsOf(screen.getAllByRole("listitem")),
    }).toEqual({ strong: "umbral", code: "monto", items: ["subir umbral", "usar monto"] });
  });

  it("formats text inside headings", () => {
    render(<AgentMarkdown text="## Cambio en **umbral**" />);

    expect({
      strong: screen.getByRole("strong").textContent,
      heading: screen.getByRole("heading", { level: 4 }).textContent,
    }).toEqual({ strong: "umbral", heading: "Cambio en umbral" });
  });
});

describe("AgentMarkdown safety", () => {
  it("shows HTML in the text as text", () => {
    const html = '<script>alert("x")</script><b>hola</b>';

    const { container } = render(<AgentMarkdown text={html} />);

    expect({
      text: container.textContent,
      elements: container.querySelectorAll("script, b").length,
    }).toEqual({ text: html, elements: 0 });
  });

  it("shows an unclosed ** as plain text", () => {
    const { container } = render(<AgentMarkdown text="Reviso el **abierto" />);

    expect({
      text: container.textContent,
      strong: screen.queryAllByRole("strong").length,
    }).toEqual({ text: "Reviso el **abierto", strong: 0 });
  });

  it("shows an unclosed fenced block without losing its text", () => {
    const { container } = render(<AgentMarkdown text={"Mira:\n\n```\nSELECT 1"} />);

    expect(container.textContent).toContain("SELECT 1");
  });
});
