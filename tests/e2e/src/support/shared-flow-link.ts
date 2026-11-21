// lz-string is CommonJS; Node only exposes its default export to ES modules.
import lzString from "lz-string";

/** The link "Compartir" produces: the flow travels compressed in the fragment and runs on open. */
export const toSharedFlowPath = (flow: unknown): string =>
  `/#flow=${lzString.compressToEncodedURIComponent(JSON.stringify(flow))}`;
