import type { Flow } from "@nodomics/protocol";
import type { EditorOpening } from "../routing/routes.ts";
import { useHubProfile } from "./hub-context.ts";
import { HubLanding } from "./HubLanding.tsx";
import type { HubTab } from "./HubTabs.tsx";
import { PersonalHub } from "./PersonalHub.tsx";

type HubPageProps = {
  readonly text: string;
  readonly tab?: HubTab;
  readonly onSearch: (text: string) => void;
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onOpenCopy: (flow: Flow) => void;
};

/** The home page (ADR 0018, 0024): a landing while signed out, the person's hub once in. */
export function HubPage({ text, tab = "for-you", onSearch, onOpenEditor }: HubPageProps) {
  const isSignedIn = useHubProfile()?.handle !== undefined;
  return isSignedIn ? (
    <PersonalHub tab={tab} text={text} onSearch={onSearch} onOpenEditor={onOpenEditor} />
  ) : (
    <HubLanding text={text} onSearch={onSearch} />
  );
}
