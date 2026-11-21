import { createContext } from "react";

/** Where a link to a page opens: the editor's tab keeps its flow, so it opens hub pages elsewhere. */
export type RouteLinkTarget = "same-tab" | "new-tab";

export const RouteLinkTargetContext = createContext<RouteLinkTarget>("same-tab");
