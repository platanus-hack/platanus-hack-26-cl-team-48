import { describe, expect, it } from "vitest";
import { renderTemplate } from "./render-template.ts";

const render = (template: string, params: Record<string, unknown> = {}) =>
  renderTemplate(template, { params, tables: { in: "in", left: "upstream_1" } });

const sqlOf = (template: string, params: Record<string, unknown> = {}) => {
  const result = render(template, params);
  return result.ok ? result.value.sql : result.error;
};

describe("renderTemplate", () => {
  it("renders input ports as quoted table aliases", () => {
    expect(sqlOf("SELECT * FROM {{in}} JOIN {{left}}")).toBe(
      'SELECT * FROM "in" JOIN "upstream_1"',
    );
  });

  it("does not HTML-escape plain values", () => {
    expect(sqlOf("x {{op}} 1", { op: ">=" })).toBe("x >= 1");
  });

  it("quotes identifiers with ident, doubling embedded quotes", () => {
    expect(sqlOf("SELECT {{ident column}}", { column: 'a"; DROP TABLE t; --' })).toBe(
      'SELECT "a""; DROP TABLE t; --"',
    );
  });

  it("keeps a value with quotes or ; DROP as a single string literal with lit", () => {
    expect(sqlOf("WHERE x = {{lit value}}", { value: "O'Brien'; DROP TABLE t; --" })).toBe(
      "WHERE x = 'O''Brien''; DROP TABLE t; --'",
    );
  });

  it("renders numbers, booleans and null as SQL literals with lit", () => {
    expect(
      sqlOf("{{lit n}} {{lit yes}} {{lit nothing}}", { n: 2.5, yes: true, nothing: null }),
    ).toBe("2.5 TRUE NULL");
  });

  it("supports eq and concat in conditions", () => {
    const template =
      "{{#if (eq op 'contiene')}}{{ident column}} ILIKE {{lit (concat '%' value '%')}}{{else}}{{ident column}} {{op}} {{lit value}}{{/if}}";

    expect(sqlOf(template, { op: "contiene", column: "c", value: "su'r" })).toBe(
      `"c" ILIKE '%su''r%'`,
    );
  });

  it("renders a source as the table alias of its loaded result and lists it", () => {
    expect(render("SELECT * FROM {{source sourceId}}", { sourceId: "src_1" })).toEqual({
      ok: true,
      value: { sql: 'SELECT * FROM "source_src_1"', sources: ["src_1"], requests: {} },
    });
  });

  it("renders an API request as a source and describes the request", () => {
    const rendered = render(
      "SELECT * FROM {{request url query=query headers=headers format=format records=records}}",
      {
        url: "https://api.example.com/ventas",
        query: [{ name: "año", value: "2024" }, { name: "vacía" }],
        headers: [{ name: "Authorization", value: "Bearer t", secret: "api" }],
        format: "json",
        records: "data.items",
      },
    );

    const [sourceId = ""] = rendered.ok ? Object.keys(rendered.value.requests) : [];
    expect(rendered).toEqual({
      ok: true,
      value: {
        sql: `SELECT * FROM "source_${sourceId}"`,
        sources: [],
        requests: {
          [sourceId]: {
            url: "https://api.example.com/ventas",
            query: [{ name: "año", value: "2024" }],
            headers: [{ name: "Authorization", value: "Bearer t" }],
            format: "json",
            records: "data.items",
          },
        },
      },
    });
    expect(sourceId).toMatch(/^request_[0-9a-f]+$/);
  });

  it("names equal requests with the same source", () => {
    const sourceOf = (url: string) => {
      const rendered = render("{{request url format=format}}", { url, format: "csv" });
      return rendered.ok ? Object.keys(rendered.value.requests) : [];
    };

    expect(sourceOf("https://a.com/x.csv")).toEqual(sourceOf("https://a.com/x.csv"));
    expect(sourceOf("https://a.com/x.csv")).not.toEqual(sourceOf("https://a.com/y.csv"));
  });

  it.each(["ftp://a.com/x", "no es una url", ""])("rejects the request URL %j", (url) => {
    expect(render("{{request url format=format}}", { url, format: "json" })).toMatchObject({
      ok: false,
      error: { code: "PARAM_INVALID" },
    });
  });

  it("rejects values that cannot be a SQL literal", () => {
    expect(render("{{lit value}}", { value: { nested: true } })).toMatchObject({
      ok: false,
      error: { code: "PARAM_INVALID" },
    });
  });

  it("reports a malformed template as a node error", () => {
    expect(render("SELECT {{#if x}}")).toMatchObject({ ok: false, error: { code: "SQL_ERROR" } });
  });
});
