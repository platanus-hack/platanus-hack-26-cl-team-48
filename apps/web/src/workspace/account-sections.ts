import { SIDE_SECTIONS, type SideSection } from "../layout/workspace-preferences.ts";

/** Sections that only make sense with an account: the agent. */
const ACCOUNT_SECTIONS: ReadonlySet<SideSection> = new Set(["agent"]);
const FALLBACK_SECTION: SideSection = "nodes";

const isReachable = (section: SideSection, isSignedIn: boolean) =>
  isSignedIn || !ACCOUNT_SECTIONS.has(section);

export const sectionsFor = (isSignedIn: boolean): ReadonlyArray<SideSection> =>
  SIDE_SECTIONS.filter((section) => isReachable(section, isSignedIn));

/** A remembered account section shows Nodos until the user signs in. */
export const reachableSection = (section: SideSection, isSignedIn: boolean): SideSection =>
  isReachable(section, isSignedIn) ? section : FALLBACK_SECTION;
