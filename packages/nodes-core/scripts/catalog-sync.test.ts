import { readFileSync } from "node:fs";
import { ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/build-catalog.ts";
import { findCaseIssues } from "../src/case-shape.ts";
import { CATALOG_FILE, NODES_DIR, readCasesFile, readNodeFolders } from "./node-files.ts";

const generatedCatalog = () => buildCatalog(readNodeFolders(NODES_DIR));

describe("catalog.generated.json", () => {
  it("matches what the generator builds from the node folders", () => {
    const committed: unknown = JSON.parse(readFileSync(CATALOG_FILE, "utf8"));

    expect(generatedCatalog()).toEqual(ok(committed));
  });
});

describe("cases.json", () => {
  it("gives every node except the flow boundaries well-formed test cases", () => {
    const catalog = generatedCatalog();
    const manifests = catalog.ok ? catalog.value : [];

    const issues = manifests
      .filter((manifest) => manifest.impl.kind !== "builtin")
      .flatMap((manifest) =>
        findCaseIssues(manifest, parseCases(readCasesFile(NODES_DIR, manifest.id))).map(
          (issue) => `${manifest.id}: ${issue}`,
        ),
      );

    expect(manifests).not.toHaveLength(0);
    expect(issues).toEqual([]);
  });

  it("validates the required params of every cases.json", () => {
    const catalog = generatedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;

    for (const manifest of catalog.value.filter((node) => node.impl.kind !== "builtin")) {
      expect(
        findCaseIssues(manifest, parseCases(readCasesFile(NODES_DIR, manifest.id))).filter(
          (issue) => issue.includes(".params"),
        ),
        manifest.id,
      ).toEqual([]);
    }
  });

  it.each([
    { name: "result", column: "x", op: "*" },
    { name: "result", column: "x", op: "*", otherColumn: "y", value: 2 },
  ])("rejects formula params without exactly one right operand: %j", (params) => {
    const catalog = generatedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const formula = catalog.value.find((manifest) => manifest.id === "core.formula");
    expect(formula).toBeDefined();
    if (formula === undefined) return;

    expect(
      findCaseIssues(formula, {
        cases: [{ name: "invalid operand", params, inputs: {}, expected: {} }],
      }).filter((issue) => issue.includes(".params")),
    ).toEqual(["cases[0].params: must match exactly one required params alternative"]);
  });
});

const parseCases = (text: string | undefined): unknown =>
  text === undefined ? undefined : JSON.parse(text);
