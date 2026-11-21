import { PROTOCOL_VERSION, type NepParams } from "@nodomics/protocol";
import type { NepHandlers } from "./nep-handlers.ts";
import type { Session } from "./session.ts";

/** Every source reads the same fixed dataset, so they all share one id. */
export const VENTAS_SOURCE_ID = "src_ventas";

export const createCatalogHandlers = (
  session: Session,
): Pick<NepHandlers, "engine.hello" | "nodes.list" | "nodes.register" | "source.add"> => ({
  "engine.hello": () => ({
    protocol: PROTOCOL_VERSION,
    engine: "mock",
    runtimes: ["sql", "python"],
    sources: ["upload", "url"],
  }),
  "nodes.list": () => ({ nodes: [...session.catalog.values()] }),
  "nodes.register": ({ nodes }) => {
    nodes.forEach((manifest) => session.catalog.set(manifest.id, manifest));
    return {};
  },
  "source.add": (params) => ({ sourceId: VENTAS_SOURCE_ID, name: nameSource(params) }),
});

function nameSource(params: NepParams<"source.add">): string {
  switch (params.kind) {
    case "upload":
      return params.name;
    case "url":
      return params.name ?? params.url;
    case "path":
      return params.path;
  }
}
