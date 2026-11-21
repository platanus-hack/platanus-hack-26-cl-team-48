import { useState } from "react";
import { parseLocalAddress, type LocalAddress } from "./local-address.ts";

export function useLocalAddress(onConnect: (address: LocalAddress) => void, initialAddress = "") {
  const [address, setAddress] = useState(initialAddress);
  const [error, setError] = useState<string>();
  function connect() {
    const parsed = parseLocalAddress(address);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(undefined);
    onConnect(parsed.value);
  }
  function editAddress(value: string) {
    setAddress(value);
    setError(undefined);
  }
  return { address, setAddress: editAddress, error, connect };
}
