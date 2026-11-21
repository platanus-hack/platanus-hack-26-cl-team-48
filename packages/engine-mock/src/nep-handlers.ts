import type {
  NepEvent,
  NepEventPayload,
  NepMethod,
  NepParams,
  NepResult,
} from "@nodomics/protocol";
import type { Session } from "./session.ts";

export type NepHandler<M extends NepMethod> = (params: NepParams<M>) => NepResult<M>;

/** One handler per NEP method; the mapped type makes a missing method a compile error. */
export type NepHandlers = { readonly [M in NepMethod]: NepHandler<M> };

export type Emit = <E extends NepEvent>(event: E, payload: NepEventPayload<E>) => void;

export type Schedule = (task: () => void) => void;

export type HandlerDeps = {
  readonly session: Session;
  readonly emit: Emit;
  readonly schedule: Schedule;
};
