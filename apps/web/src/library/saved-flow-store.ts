import type { FlowVisibility } from "@nodomics/hub";
import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { Command } from "../flow/flow-commands.ts";
import type { NoticeProps } from "@nodomics/ui";
import { duplicateSavedFlow } from "./duplicate-saved-flow.ts";
import { MESSAGES } from "../messages.ts";
import type { FlowLibrary, LibraryResult, SavedFlow, StoredFile } from "./flow-library.ts";

export type SavedFlowStatus = "unsaved" | "saving" | "saved" | "unavailable" | "signed-out";
/** States an edit or a new flow does not clear: saving cannot work until they change. */
export const isBlockedStatus = (status: SavedFlowStatus) =>
  status === "unavailable" || status === "signed-out";
export type SavedFlowState = {
  readonly currentId: string | undefined;
  readonly status: SavedFlowStatus;
  readonly flows: ReadonlyArray<SavedFlow>;
  readonly storedFiles: ReadonlyArray<StoredFile>;
  readonly files: Readonly<Record<string, string>>;
  readonly sessionSources: ReadonlySet<string>;
  readonly sessionFiles: Readonly<Record<string, string>>;
  readonly generation: number;
  readonly sessionEpoch: number;
  readonly isOpening: boolean;
  readonly library: FlowLibrary;
  readonly report: <T>(result: LibraryResult<T>) => T;
  readonly refresh: () => Promise<void>;
  readonly initialize: (hasSharedFlow: boolean) => Promise<void>;
  readonly openFlow: (id: string) => Promise<void>;
  readonly newFlow: () => Promise<void>;
  readonly flushPending: () => Promise<void>;
  readonly loadFlow: (flow: Flow) => Promise<void>;
  readonly resetForLoad: () => void;
  readonly trackSource: (id: string, key: string) => void;
  readonly resetSources: () => void;
  readonly duplicate: (id: string) => Promise<void>;
  readonly rename: (id: string, name: string) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly setVisibility: (id: string, visibility: FlowVisibility) => Promise<void>;
  readonly removeFile: (key: string) => Promise<void>;
};

export type SavedFlowDeps = {
  readonly library: FlowLibrary;
  readonly dispatch: (command: Command) => void;
  readonly show: (notice: Pick<NoticeProps, "tone" | "title" | "detail">) => void;
};
type Store = StoreApi<SavedFlowState>;
type Context = {
  readonly deps: SavedFlowDeps;
  readonly set: Store["setState"];
  readonly get: Store["getState"];
};

export function createSavedFlowStore(deps: SavedFlowDeps) {
  return createStore<SavedFlowState>((set, get) => ({
    ...initialSavedFlowState(),
    library: deps.library,
    report: createReport({ deps, set, get }),
    ...savedFlowActions({ deps, set, get }),
  }));
}

function initialSavedFlowState(): Omit<
  SavedFlowState,
  "library" | "report" | keyof ReturnType<typeof savedFlowActions>
> {
  return {
    currentId: undefined,
    status: "unsaved",
    flows: [],
    storedFiles: [],
    files: {},
    sessionSources: new Set<string>(),
    sessionFiles: {},
    generation: 0,
    sessionEpoch: 0,
    isOpening: false,
  };
}

function createReport({ deps, set }: Context): SavedFlowState["report"] {
  const reported = new Set<string>();
  return (result) => {
    if (result.issue === "unavailable" || result.issue === "signed-out")
      set({ status: result.issue });
    // Signed out is shown in the toolbar and in Mis flujos, not as a notice.
    if (result.issue === "signed-out") return result.value;
    if (result.issue !== undefined && !reported.has(result.issue)) {
      reported.add(result.issue);
      deps.show({ tone: "warn", title: MESSAGES.savedFlows[result.issue] });
    }
    return result.value;
  };
}

function savedFlowActions(context: Context) {
  return {
    refresh: createRefresh(context),
    initialize: createInitialize(context),
    openFlow: createOpenFlow(context),
    loadFlow: createLoadFlow(context),
    resetForLoad: createResetForLoad(context),
    flushPending: createFlushPending(),
    newFlow: createNewFlow(context),
    trackSource: createTrackSource(context),
    resetSources: createResetSources(context),
    duplicate: createDuplicate(context),
    rename: createRename(context),
    remove: createRemove(context),
    setVisibility: createSetVisibility(context),
    removeFile: createRemoveFile(context),
  };
}

function createRefresh({ deps, set, get }: Context): SavedFlowState["refresh"] {
  return async () => {
    const listed = await deps.library.listFlows();
    const flows = get().report(listed);
    const storedFiles = get().report(await deps.library.listFiles());
    set({ flows, storedFiles });
    if (listed.issue !== "signed-out" && get().status === "signed-out") set({ status: "unsaved" });
  };
}

function createInitialize({ get }: Context): SavedFlowState["initialize"] {
  return async (hasSharedFlow) => {
    await get().refresh();
    const latest = get().flows[0];
    if (!hasSharedFlow && latest !== undefined) await get().openFlow(latest.id);
    else get().resetForLoad();
  };
}

function createOpenFlow({ deps, set, get }: Context): SavedFlowState["openFlow"] {
  return async (id) => {
    await get().flushPending();
    const saved = get().report(await deps.library.readFlow(id));
    if (saved === undefined) return;
    set({
      isOpening: true,
      currentId: id,
      files: saved.files,
      generation: get().generation + 1,
      sessionSources: matchingSessionSources(saved.files, get().sessionFiles),
    });
    deps.dispatch({ type: "flow.load", flow: saved.flow });
    set({ isOpening: false, status: isBlockedStatus(get().status) ? get().status : "saved" });
  };
}

function createLoadFlow({ deps, get }: Context): SavedFlowState["loadFlow"] {
  return async (flow) => {
    await get().flushPending();
    deps.dispatch({ type: "flow.load", flow });
  };
}

function createResetForLoad({ set, get }: Context): SavedFlowState["resetForLoad"] {
  return () => {
    if (get().isOpening) return;
    set({
      currentId: undefined,
      files: {},
      sessionSources: new Set(),
      generation: get().generation + 1,
      status: isBlockedStatus(get().status) ? get().status : "unsaved",
    });
  };
}

function createFlushPending(): SavedFlowState["flushPending"] {
  return () => Promise.resolve();
}

function createNewFlow({ deps, get }: Context): SavedFlowState["newFlow"] {
  return async () => {
    await get().flushPending();
    deps.dispatch({ type: "flow.load", flow: { format: FLOW_FORMAT, nodes: [], edges: [] } });
  };
}

function createTrackSource({ set, get }: Context): SavedFlowState["trackSource"] {
  return (id, key) => {
    set({
      files: { ...get().files, [id]: key },
      sessionSources: new Set([...get().sessionSources, id]),
      sessionFiles: { ...get().sessionFiles, [id]: key },
    });
  };
}

function createResetSources({ set, get }: Context): SavedFlowState["resetSources"] {
  return () => {
    set({ sessionSources: new Set(), sessionFiles: {}, sessionEpoch: get().sessionEpoch + 1 });
  };
}

function createDuplicate({ deps, get }: Context): SavedFlowState["duplicate"] {
  return async (id) => {
    const saved = get().report(await deps.library.readFlow(id));
    if (saved !== undefined)
      get().report(
        await deps.library.saveFlow(
          duplicateSavedFlow(saved, {
            id: `flow_${crypto.randomUUID()}`,
            updatedAt: Date.now(),
          }),
        ),
      );
    await get().refresh();
  };
}

function createRename({ deps, get }: Context): SavedFlowState["rename"] {
  return async (id, name) => {
    if (get().currentId === id) deps.dispatch({ type: "flow.rename", name });
    const saved = get().report(await deps.library.readFlow(id));
    if (saved !== undefined)
      get().report(
        await deps.library.saveFlow({
          ...saved,
          name,
          flow: { ...saved.flow, name },
          updatedAt: Date.now(),
        }),
      );
    await get().refresh();
  };
}

function createRemove({ deps, get }: Context): SavedFlowState["remove"] {
  return async (id) => {
    await get().flushPending();
    get().report(await deps.library.deleteFlow(id));
    if (get().currentId === id) get().resetForLoad();
    await get().refresh();
  };
}

function createSetVisibility({ deps, get }: Context): SavedFlowState["setVisibility"] {
  return async (id, visibility) => {
    const saved = get().report(await deps.library.readFlow(id));
    if (saved !== undefined) get().report(await deps.library.saveFlow({ ...saved, visibility }));
    await get().refresh();
  };
}

function createRemoveFile({ deps, get }: Context): SavedFlowState["removeFile"] {
  return async (key) => {
    get().report(await deps.library.deleteFile(key));
    await get().refresh();
  };
}

function matchingSessionSources(
  files: Readonly<Record<string, string>>,
  sessionFiles: Readonly<Record<string, string>>,
): ReadonlySet<string> {
  return new Set(
    Object.entries(files)
      .filter(([id, key]) => sessionFiles[id] === key)
      .map(([id]) => id),
  );
}
