import type { Flow } from "@nodomics/protocol";
import { sortKeys } from "./node-version.ts";

/** Equal for flows with the same content, whatever the order of their keys (ADR 0024). */
export const flowFingerprint = (flow: Flow): string => JSON.stringify(sortKeys(flow));
