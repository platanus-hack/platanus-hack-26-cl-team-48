import { ExecutorNotifications, ExecutorRequests } from "./executor.ts";
import { Flow } from "./flow.ts";
import { NodeManifest } from "./manifest.ts";
import { NepNotifications, NepRequests, PROTOCOL_VERSION } from "./nep.ts";

/**
 * Plain JSON Schema for every message, for engines written in other languages.
 * Binary fields appear as `{"type": "Uint8Array"}`; JSON transports encode them as base64.
 */
export function exportJsonSchemas() {
  return toPlainJson({
    protocol: PROTOCOL_VERSION,
    nep: { requests: NepRequests, notifications: NepNotifications },
    executor: { requests: ExecutorRequests, notifications: ExecutorNotifications },
    flow: Flow,
    manifest: NodeManifest,
  });
}

// TypeBox schemas carry symbol keys; a JSON round trip leaves only standard JSON Schema.
const toPlainJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
