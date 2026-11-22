import { readFileSync } from "node:fs";
import { ok, type NodeManifest } from "@nodomics/protocol";
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
  it("gives every node except the flow boundaries and the resources well-formed test cases", () => {
    const catalog = generatedCatalog();
    const manifests = catalog.ok ? catalog.value : [];

    const issues = manifests
      .filter(hasExecutionCases)
      .flatMap((manifest) =>
        findCaseIssues(manifest, parseCases(readCasesFile(NODES_DIR, manifest.id))).map(
          (issue) => `${manifest.id}: ${issue}`,
        ),
      );

    expect(manifests).not.toHaveLength(0);
    expect(issues).toEqual([]);
  });

  it("gives resource nodes no execution cases, since they never run", () => {
    const catalog = generatedCatalog();
    const resources = catalog.ok
      ? catalog.value.filter((manifest) => manifest.impl.kind === "resource")
      : [];

    expect(resources.map((manifest) => manifest.id)).toEqual([
      "core.deploy.repo",
      "core.deploy.service",
    ]);
    expect(
      resources.filter((manifest) => readCasesFile(NODES_DIR, manifest.id) !== undefined),
    ).toEqual([]);
  });

  it("validates the required params of every cases.json", () => {
    const catalog = generatedCatalog();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;

    for (const manifest of catalog.value.filter(hasExecutionCases)) {
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

const NODE_KINDS_WITHOUT_CASES: ReadonlyArray<NodeManifest["impl"]["kind"]> = [
  "builtin",
  "resource",
];

const hasExecutionCases = (manifest: NodeManifest) =>
  !NODE_KINDS_WITHOUT_CASES.includes(manifest.impl.kind);

const parseCases = (text: string | undefined): unknown =>
  text === undefined ? undefined : JSON.parse(text);
