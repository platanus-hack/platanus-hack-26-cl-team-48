import type { Result } from "@nodomics/protocol";
import type { DeploymentStatus, ServiceSpec } from "./types.ts";

export type ProviderError = { readonly message: string };
export type Secrets = Readonly<Record<string, string>>;

/** Where services are hosted. The use cases depend on this port, never on Render itself. */
export interface HostingProvider {
  create(input: {
    readonly name: string;
    readonly spec: ServiceSpec;
    readonly secrets: Secrets;
  }): Promise<Result<{ readonly serviceId: string; readonly url?: string }, ProviderError>>;
  update(
    serviceId: string,
    input: { readonly spec: ServiceSpec; readonly secrets: Secrets },
  ): Promise<Result<void, ProviderError>>;
  status(serviceId: string): Promise<Result<DeploymentStatus, ProviderError>>;
  remove(serviceId: string): Promise<Result<void, ProviderError>>;
}
