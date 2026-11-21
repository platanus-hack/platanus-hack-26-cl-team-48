import type { Transport } from "@nodomics/client";
import type { Engine } from "@nodomics/ui";
import type { LocalAddress } from "./local-address.ts";

/** An engine the user can pick. Only the registry knows how each one is started. */
export type EngineEntry = {
  readonly id: string;
  readonly label: string;
  readonly badge: Engine;
  readonly address?: "local";
  readonly connect: (address?: LocalAddress) => Transport;
};
