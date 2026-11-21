import Handlebars from "handlebars";
import { err, ok, type NodeError, type Result } from "@nodomics/protocol";
import { describeRequest, requestSourceId, type HttpRequest } from "./http-request.ts";
import { quoteIdentifier, quoteLiteral } from "./sql-quoting.ts";

export type TemplateContext = {
  readonly params: Readonly<Record<string, unknown>>;
  /** Input port id → name of the table that holds its data. */
  readonly tables: Readonly<Record<string, string>>;
};

/** The final SQL, the sources it reads through `{{source …}}` and the APIs through `{{request …}}`. */
export type RenderedSql = {
  readonly sql: string;
  readonly sources: string[];
  readonly requests: Readonly<Record<string, HttpRequest>>;
};

type Collected = { readonly sources: Set<string>; readonly requests: Map<string, HttpRequest> };

// SQL is not HTML: escaping happens only in the ident/lit helpers, after params passed validation.
const COMPILE_OPTIONS = { noEscape: true };

class TemplateValueError extends Error {}

/** Table alias under which a loaded source is visible to a task. */
export const sourceAlias = (sourceId: string): string => `source_${sourceId}`;

export function renderTemplate(
  template: string,
  context: TemplateContext,
): Result<RenderedSql, NodeError> {
  const collected: Collected = { sources: new Set(), requests: new Map() };
  // Handlebars reports both template and helper failures by throwing; they become node errors here.
  try {
    const sql = createTemplateEngine(collected).compile(
      template,
      COMPILE_OPTIONS,
    )(templateData(context));
    return ok({
      sql,
      sources: [...collected.sources],
      requests: Object.fromEntries(collected.requests),
    });
  } catch (error) {
    return err(toNodeError(error));
  }
}

function createTemplateEngine({ sources, requests }: Collected): typeof Handlebars {
  const engine = Handlebars.create();
  engine.registerHelper({
    ident: (value: unknown) => quoteIdentifier(requireText(value)),
    lit: (value: unknown) => requireLiteral(value),
    source: (sourceId: unknown) => {
      sources.add(requireText(sourceId));
      return quoteIdentifier(sourceAlias(requireText(sourceId)));
    },
    request: (url: unknown, options: { readonly hash?: Readonly<Record<string, unknown>> }) => {
      const request = describeRequest(url, options.hash ?? {});
      if (!request.ok) throw new TemplateValueError(request.error);
      const sourceId = requestSourceId(request.value);
      requests.set(sourceId, request.value);
      return quoteIdentifier(sourceAlias(sourceId));
    },
    eq: (left: unknown, right: unknown) => left === right,
    // Handlebars passes its options object as the last argument of every helper.
    concat: (...parts: unknown[]) => parts.slice(0, -1).map(String).join(""),
  });
  return engine;
}

const templateData = (context: TemplateContext) => ({
  ...context.params,
  ...Object.fromEntries(
    Object.entries(context.tables).map(([port, table]) => [port, quoteIdentifier(table)]),
  ),
});

function requireText(value: unknown): string {
  if (typeof value === "string") return value;
  throw new TemplateValueError(`${JSON.stringify(value)} no es un nombre válido`);
}

function requireLiteral(value: unknown): string {
  const literal = quoteLiteral(value);
  if (literal.ok) return literal.value;
  throw new TemplateValueError(literal.error);
}

const toNodeError = (error: unknown): NodeError =>
  error instanceof TemplateValueError
    ? {
        code: "PARAM_INVALID",
        message: "Un parámetro no se puede usar en la consulta",
        detail: error.message,
      }
    : { code: "SQL_ERROR", message: "La plantilla del nodo no es válida", detail: String(error) };
