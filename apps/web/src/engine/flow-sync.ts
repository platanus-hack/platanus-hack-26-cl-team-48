import type { Flow } from "@nodomics/protocol";

export type Timers = {
  readonly set: (callback: () => void, delayMs: number) => number;
  readonly clear: (handle: number) => void;
};

export type FlowSync = {
  /** Submits `flow` once no newer change arrives within the delay. */
  readonly schedule: (rev: number, flow: Flow) => void;
  /** Submits the pending flow now, if any, so a run sees the latest revision. */
  readonly flush: () => Promise<number | undefined>;
  readonly cancel: () => void;
};

type Pending = { readonly handle: number; readonly rev: number; readonly flow: Flow };

export function createFlowSync(deps: {
  readonly delayMs: number;
  readonly timers: Timers;
  readonly submit: (rev: number, flow: Flow) => Promise<void>;
  readonly onError: (error: unknown) => void;
}): FlowSync {
  const state: {
    pending: Pending | undefined;
    active: Promise<number | undefined> | undefined;
    confirmedRev: number | undefined;
  } = {
    pending: undefined,
    active: undefined,
    confirmedRev: undefined,
  };
  const takePending = () => {
    const { pending } = state;
    if (pending !== undefined) deps.timers.clear(pending.handle);
    state.pending = undefined;
    return pending;
  };
  const drain = async () => {
    while (state.pending !== undefined) {
      const pending = takePending();
      if (pending !== undefined) {
        await deps.submit(pending.rev, pending.flow);
        state.confirmedRev = pending.rev;
      }
    }
    return state.confirmedRev;
  };
  const submitPending = (): Promise<number | undefined> => {
    state.active ??= drain().finally(() => {
      state.active = undefined;
    });
    return state.active;
  };
  return {
    schedule: (rev, flow) => {
      takePending();
      state.pending = {
        handle: deps.timers.set(() => {
          void submitPending().catch(deps.onError);
        }, deps.delayMs),
        rev,
        flow,
      };
    },
    flush: submitPending,
    cancel: () => {
      takePending();
    },
  };
}
