import { useEffect } from "react";
import { useStore } from "zustand";
import { useAppStores } from "../app-context.ts";

export function useSecretNames(): ReadonlyArray<string> {
  const { secretStore } = useAppStores();
  useEffect(() => {
    void secretStore.getState().refresh();
  }, [secretStore]);
  return useStore(secretStore, (state) => state.secrets).map(({ name }) => name);
}
