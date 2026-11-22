import { describe, expect, it } from "vitest";
import { savedFlowOf } from "./cloud-flow-fixtures.ts";
import type { SavedFlow } from "./flow-library.ts";
import { publicationStatusOf } from "./publication-status.ts";

const publishedLink = (hasChanges: boolean): NonNullable<SavedFlow["published"]> => ({
  publicationId: "pub_1",
  handle: "ana",
  slug: "ventas",
  version: "1.2.3",
  fingerprint: "abc",
  hasChanges,
});

describe("publicationStatusOf", () => {
  it("is unpublished for a flow without a publication link", () => {
    const status = publicationStatusOf(savedFlowOf("one"));

    expect(status).toEqual({ kind: "unpublished" });
  });

  it("is published with the version when nothing changed since publishing", () => {
    const status = publicationStatusOf(savedFlowOf("one", { published: publishedLink(false) }));

    expect(status).toEqual({ kind: "published", version: "1.2.3" });
  });

  it("is changed with the published version when the flow changed since publishing", () => {
    const status = publicationStatusOf(savedFlowOf("one", { published: publishedLink(true) }));

    expect(status).toEqual({ kind: "changed", version: "1.2.3" });
  });
});
