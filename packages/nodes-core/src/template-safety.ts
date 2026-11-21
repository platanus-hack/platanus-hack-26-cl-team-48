import type { NodeManifest } from "@nodomics/protocol";
import { isRecord } from "./is-record.ts";

const MUSTACHE = /\{\{\{?[^}]*\}?\}\}/g;
const BLOCK_HELPERS: ReadonlySet<string> = new Set(["if", "unless", "each"]);
const OUTPUT_HELPERS: ReadonlySet<string> = new Set(["ident", "lit", "source", "request"]);
const EXPRESSION_HELPERS: ReadonlySet<string> = new Set([...OUTPUT_HELPERS, "eq", "concat"]);
const SUBEXPRESSION_HELPER = /\(\s*([^\s()]+)/g;
const STRING_LITERAL = /'[^']*'|"[^"]*"/g;

/** The data a template can print at one point: a params schema and, at the top, the input ports. */
type Scope = { readonly schema: unknown; readonly ports: ReadonlySet<string> };

/**
 * Lists the mustaches of a SQL template that could print a free param unescaped (ADR 0006):
 * only `ident`, `lit`, `source` and `request` print, ports and enum-restricted params print as they are.
 */
export function findUnsafeInterpolations(manifest: NodeManifest): string[] {
  if (manifest.impl.kind !== "sql") return [];
  return scanTemplate(manifest.impl.template, {
    schema: manifest.params,
    ports: new Set(manifest.inputs.map((port) => port.id)),
  });
}

function scanTemplate(template: string, root: Scope): string[] {
  const scopes = [root];
  const unsafe: string[] = [];
  for (const [tag] of template.matchAll(MUSTACHE)) {
    const scope = scopes.at(-1) ?? root;
    if (!isSafeTag(tag, scope)) unsafe.push(tag);
    if (tag.startsWith("{{#")) scopes.push(enterBlock(tagBody(tag).slice(1), scope));
    if (tag.startsWith("{{/") && scopes.length > 1) scopes.pop();
  }
  return unsafe;
}

function isSafeTag(tag: string, scope: Scope): boolean {
  if (tag.startsWith("{{{")) return false;
  const body = tagBody(tag);
  if (body.startsWith("/") || body.startsWith("!") || body === "else") return true;
  if (body.startsWith("#")) return isSafeBlock(body.slice(1));
  return isSafeOutput(body, scope);
}

const isSafeBlock = (body: string) =>
  BLOCK_HELPERS.has(headOf(body)) && usesOnlyExpressionHelpers(body);

function isSafeOutput(body: string, scope: Scope): boolean {
  const head = headOf(body);
  return head === body
    ? scope.ports.has(head) || hasEnum(resolvePath(head, scope.schema))
    : OUTPUT_HELPERS.has(head) && usesOnlyExpressionHelpers(body);
}

function enterBlock(body: string, scope: Scope): Scope {
  const [helper, path = ""] = body.split(/\s+/);
  return helper === "each"
    ? { schema: propertyOf(resolvePath(path, scope.schema), "items"), ports: new Set() }
    : scope;
}

const usesOnlyExpressionHelpers = (body: string) =>
  [...body.replace(STRING_LITERAL, "''").matchAll(SUBEXPRESSION_HELPER)].every(([, helper]) =>
    EXPRESSION_HELPERS.has(helper ?? ""),
  );

const resolvePath = (path: string, schema: unknown) =>
  path === "this" ? schema : propertyOf(propertyOf(schema, "properties"), path);

const hasEnum = (schema: unknown) => Array.isArray(propertyOf(schema, "enum"));

const propertyOf = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const tagBody = (tag: string) => tag.replace(/^\{\{\{?|\}?\}\}$/g, "").trim();

const headOf = (body: string) => body.split(/\s+/)[0] ?? "";
