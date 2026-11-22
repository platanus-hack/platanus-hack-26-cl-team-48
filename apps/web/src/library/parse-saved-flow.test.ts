import { describe, expect, it } from "vitest";
import { savedFlowOf } from "./cloud-flow-fixtures.ts";
import type { SavedFlow } from "./flow-library.ts";
import { parseSavedFlow } from "./parse-saved-flow.ts";

const PUBLISHED: NonNullable<SavedFlow["published"]> = {
  publicationId: "pub_1",
  handle: "ana",
  slug: "ventas",
  version: "0.1.0",
  fingerprint: "abc",
  hasChanges: false,
};

const documentWith = (published: unknown): unknown => ({ ...savedFlowOf("one"), published });

describe("parseSavedFlow publication link", () => {
  it("keeps a valid publication link", () => {
    const parsed = parseSavedFlow(savedFlowOf("one", { published: PUBLISHED }));

    expect(parsed?.published).toEqual(PUBLISHED);
  });

  it("keeps a publication link with changes", () => {
    const parsed = parseSavedFlow(
      savedFlowOf("one", { published: { ...PUBLISHED, hasChanges: true } }),
    );

    expect(parsed?.published?.hasChanges).toBe(true);
  });

  it("reads a flow without a publication link with no published key", () => {
    const parsed = parseSavedFlow(savedFlowOf("one"));

    expect(parsed === undefined ? undefined : "published" in parsed).toBe(false);
  });

  it.each<[string, unknown]>([
    ["a string", "pub_1"],
    ["null", null],
    ["an empty object", {}],
    ["a missing publicationId", { ...PUBLISHED, publicationId: undefined }],
    ["a missing handle", { ...PUBLISHED, handle: undefined }],
    ["a missing slug", { ...PUBLISHED, slug: undefined }],
    ["a missing version", { ...PUBLISHED, version: undefined }],
    ["a missing fingerprint", { ...PUBLISHED, fingerprint: undefined }],
    ["a missing hasChanges", { ...PUBLISHED, hasChanges: undefined }],
    ["a numeric version", { ...PUBLISHED, version: 1 }],
    ["a text hasChanges", { ...PUBLISHED, hasChanges: "no" }],
  ])("rejects the whole flow when the publication link is %s", (_, published) => {
    const parsed = parseSavedFlow(documentWith(published));

    expect(parsed).toBeUndefined();
  });

  it("reads a document that still carries a visibility without it", () => {
    const parsed = parseSavedFlow({ ...savedFlowOf("one"), visibility: "public" });

    expect(parsed).toEqual(savedFlowOf("one"));
  });
});
