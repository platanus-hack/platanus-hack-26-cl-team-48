import { createContext, useContext } from "react";
import type { DeployService } from "./deploy-service.ts";

/** The hosting service of this app instance, injected by the composition root. */
export const DeployContext = createContext<DeployService | undefined>(undefined);

export function useDeploy(): DeployService {
  const deploy = useContext(DeployContext);
  if (deploy === undefined)
    throw new Error("useDeploy must be used inside a DeployContext provider");
  return deploy;
}
