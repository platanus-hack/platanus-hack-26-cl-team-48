import { createContext, use } from "react";
import type { EngineSession } from "./engine-session.ts";

/** A connected session plus the way to make sure the engine has the latest flow. */
export type EngineConnection = {
  readonly session: EngineSession;
  readonly flushFlow: () => Promise<number | undefined>;
};

export const EngineConnectionContext = createContext<EngineConnection | undefined>(undefined);

/** `undefined` while connecting or when the engine could not be reached. */
export const useEngineConnection = (): EngineConnection | undefined => use(EngineConnectionContext);
