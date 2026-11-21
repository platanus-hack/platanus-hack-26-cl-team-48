import {
  err,
  NepErrorCode,
  ok,
  PROTOCOL_VERSION,
  type Capabilities,
  type NepParams,
  type Result,
} from "@nodomics/protocol";
import { RpcError } from "@nodomics/rpc";
import { isCompatibleProtocol } from "./protocol-compatibility.ts";

export type ClientIdentity = Omit<NepParams<"engine.hello">, "protocol">;

export type ConnectError =
  | { readonly code: "PROTOCOL_MISMATCH"; readonly expected: string; readonly received: string }
  | { readonly code: "UNAUTHORIZED" };

type SayHello = (params: NepParams<"engine.hello">) => Promise<Capabilities>;

const UNKNOWN_VERSION = "unknown";

const connectErrorsByRpcCode: ReadonlyMap<number, (error: RpcError) => ConnectError> = new Map([
  [
    NepErrorCode.PROTOCOL_MISMATCH,
    (error: RpcError) =>
      protocolMismatch(typeof error.data === "string" ? error.data : UNKNOWN_VERSION),
  ],
  [NepErrorCode.UNAUTHORIZED, () => ({ code: "UNAUTHORIZED" })],
]);

/** Expected refusals of the hello become values; any other failure is not ours to interpret. */
export async function connect(
  sayHello: SayHello,
  identity: ClientIdentity,
): Promise<Result<Capabilities, ConnectError>> {
  try {
    return checkCompatibility(await sayHello({ protocol: PROTOCOL_VERSION, ...identity }));
  } catch (error) {
    const connectError = connectErrorFrom(error);
    if (connectError === undefined) throw error;
    return err(connectError);
  }
}

const connectErrorFrom = (error: unknown): ConnectError | undefined =>
  error instanceof RpcError ? connectErrorsByRpcCode.get(error.code)?.(error) : undefined;

const checkCompatibility = (capabilities: Capabilities): Result<Capabilities, ConnectError> =>
  isCompatibleProtocol(PROTOCOL_VERSION, capabilities.protocol)
    ? ok(capabilities)
    : err(protocolMismatch(capabilities.protocol));

const protocolMismatch = (received: string): ConnectError => ({
  code: "PROTOCOL_MISMATCH",
  expected: PROTOCOL_VERSION,
  received,
});
