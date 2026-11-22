import type { FlowDraft, FlowStore, HubError, StoredFlow } from "@nodomics/hub";
import type { Result } from "@nodomics/protocol";
import type { FlowLibrary, LibraryIssue, LibraryResult, SavedFlow } from "./flow-library.ts";
import { parseSavedFlow } from "./parse-saved-flow.ts";

type CloudFlowLibraryDeps = { readonly flows: FlowStore; readonly local: FlowLibrary };

/**
 * Flows live in the account (ADR 0023); data files and credentials stay in this browser, since
 * credentials never leave it.
 */
export function createCloudFlowLibrary({ flows, local }: CloudFlowLibraryDeps): FlowLibrary {
  return {
    listFlows: async () => toSavedFlows(await flows.listOwnFlows()),
    readFlow: async (id) => toSavedFlow(await flows.readFlow(id)),
    saveFlow: async (saved) => toVoid(await flows.saveOwnFlow(draftOf(saved))),
    deleteFlow: async (id) => toVoid(await flows.deleteOwnFlow(id)),
    listFiles: () => local.listFiles(),
    readFile: (key) => local.readFile(key),
    saveFile: (file) => local.saveFile(file),
    deleteFile: (key) => local.deleteFile(key),
    listSecretNames: () => local.listSecretNames(),
    readSecrets: () => local.readSecrets(),
    saveSecret: (secret) => local.saveSecret(secret),
    deleteSecret: (name) => local.deleteSecret(name),
  };
}

/** Saved flows stay private drafts; publishing is what makes something public (ADR 0024). */
const draftOf = (saved: SavedFlow): FlowDraft => ({ id: saved.id, document: saved });

const savedFlowOf = (stored: StoredFlow): SavedFlow | undefined => parseSavedFlow(stored.document);

function toSavedFlows(
  result: Result<ReadonlyArray<StoredFlow>, HubError>,
): LibraryResult<ReadonlyArray<SavedFlow>> {
  if (!result.ok) return { value: [], issue: issueOf(result.error) };
  const saved = result.value.map(savedFlowOf);
  const valid = saved.filter((flow) => flow !== undefined);
  return valid.length === saved.length ? { value: valid } : { value: valid, issue: "invalid" };
}

function toSavedFlow(
  result: Result<StoredFlow | undefined, HubError>,
): LibraryResult<SavedFlow | undefined> {
  if (!result.ok) return { value: undefined, issue: issueOf(result.error) };
  if (result.value === undefined) return { value: undefined };
  const saved = savedFlowOf(result.value);
  return saved === undefined ? { value: undefined, issue: "invalid" } : { value: saved };
}

function toVoid(result: Result<void, HubError>): LibraryResult<void> {
  return result.ok ? { value: undefined } : { value: undefined, issue: issueOf(result.error) };
}

const issueOf = (error: HubError): LibraryIssue =>
  error.kind === "signed-out" ? "signed-out" : "unavailable";
