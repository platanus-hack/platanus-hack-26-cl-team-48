import { useRef, useState } from "react";
import type { EngineEntry } from "./engine-entry.ts";
import type { Connection } from "./engine-state.ts";
import type { LocalAddress } from "./local-address.ts";

export function useEngineSelection(
  engine: EngineEntry,
  connection: Connection,
  onEngineChange: (entry: EngineEntry) => void,
) {
  const [pending, setPending] = useState<EngineEntry>();
  const [previousConnection, setPreviousConnection] = useState(connection);
  const addresses = useRef(new Map<string, string>());
  if (previousConnection !== connection) {
    setPreviousConnection(connection);
    if (
      connection.status === "failed" &&
      connection.engineId === engine.id &&
      engine.address === "local"
    )
      setPending(engine);
  }
  function pick(entry: EngineEntry) {
    if (entry.address !== undefined) {
      setPending(entry);
      return;
    }
    setPending(undefined);
    onEngineChange(entry);
  }
  function connect(address: LocalAddress) {
    if (pending === undefined) return;
    const url = new URL(address.url);
    url.searchParams.set("token", address.token);
    addresses.current.set(pending.id, url.href);
    setPending(undefined);
    onEngineChange({ ...pending, connect: () => pending.connect(address) });
  }
  return {
    pending,
    pick,
    connect,
    address: pending === undefined ? "" : (addresses.current.get(pending.id) ?? ""),
  };
}
