import { err, ok } from "@nodomics/protocol";
import { envValuesOf } from "./env-values.ts";
import type { HostingProvider } from "./hosting-provider.ts";
import type { ServiceSpec } from "./types.ts";

type HostedService = {
  readonly name: string;
  readonly spec: ServiceSpec;
  readonly env: Readonly<Record<string, string>>;
};

/** A hosting provider in memory, for tests and local development: every service is live at once. */
export function createMemoryHostingProvider(): HostingProvider & {
  readonly services: ReadonlyMap<string, HostedService>;
} {
  const services = new Map<string, HostedService>();
  let createdCount = 0;
  const unknown = (serviceId: string) => err({ message: `Unknown service ${serviceId}` });
  const envOf = (spec: ServiceSpec, secrets: Readonly<Record<string, string>>) =>
    Object.fromEntries(envValuesOf(spec.env, secrets).map(({ key, value }) => [key, value]));
  return {
    services,
    create: ({ name, spec, secrets }) => {
      createdCount += 1;
      const serviceId = `srv-${String(createdCount)}`;
      services.set(serviceId, { name, spec, env: envOf(spec, secrets) });
      return Promise.resolve(ok({ serviceId, url: `https://${name}.onrender.com` }));
    },
    update: (serviceId, { spec, secrets }) => {
      const service = services.get(serviceId);
      if (service === undefined) return Promise.resolve(unknown(serviceId));
      services.set(serviceId, { name: service.name, spec, env: envOf(spec, secrets) });
      return Promise.resolve(ok(undefined));
    },
    status: (serviceId) =>
      Promise.resolve(services.has(serviceId) ? ok("live" as const) : unknown(serviceId)),
    remove: (serviceId) =>
      Promise.resolve(services.delete(serviceId) ? ok(undefined) : unknown(serviceId)),
  };
}
