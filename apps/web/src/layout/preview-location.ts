import { createContext, use } from "react";
import type { PreviewLocation } from "./workspace-preferences.ts";

export type PreviewLocationControls = {
  readonly location: PreviewLocation;
  /** Shows a node's whole result in the panel, from a preview inside the node. */
  readonly openInPanel: (nodeId: string) => void;
};

export const PreviewLocationContext = createContext<PreviewLocationControls>({
  location: "panel",
  openInPanel: () => undefined,
});

export const usePreviewLocation = () => use(PreviewLocationContext);
