import { describe, expect, it } from "vitest";
import type { Secret } from "../library/flow-library.ts";
import { secretsForDeploy } from "./deploy-secrets.ts";

const STRIPE: Secret = { name: "stripe", value: "sk_live_123" };
const DATABASE: Secret = { name: "database", value: "postgres://user:pass@host/db" };
const UNUSED: Secret = { name: "unused", value: "nunca viaja" };
const CREDENTIALS = [STRIPE, DATABASE, UNUSED];

describe("secretsForDeploy", () => {
  it("returns the value of each credential the variables reference, by credential name", () => {
    const env = [
      { name: "STRIPE_KEY", secret: "stripe" },
      { name: "DATABASE_URL", secret: "database" },
    ];

    const secrets = secretsForDeploy(env, CREDENTIALS);

    expect(secrets).toEqual({ stripe: STRIPE.value, database: DATABASE.value });
  });

  it("leaves out credentials that no variable references", () => {
    const env = [{ name: "STRIPE_KEY", secret: "stripe" }];

    const secrets = secretsForDeploy(env, CREDENTIALS);

    expect(Object.keys(secrets)).toEqual(["stripe"]);
  });

  it("ignores variables with a plain value", () => {
    const env = [{ name: "MODE", value: "prod" }];

    const secrets = secretsForDeploy(env, CREDENTIALS);

    expect(secrets).toEqual({});
  });

  it("leaves out a referenced credential the user does not have", () => {
    const env = [
      { name: "STRIPE_KEY", secret: "stripe" },
      { name: "MISSING", secret: "not-saved" },
    ];

    const secrets = secretsForDeploy(env, CREDENTIALS);

    expect(secrets).toEqual({ stripe: STRIPE.value });
  });

  it("sends a credential once when several variables reference it", () => {
    const env = [
      { name: "STRIPE_KEY", secret: "stripe" },
      { name: "STRIPE_KEY_COPY", secret: "stripe" },
    ];

    const secrets = secretsForDeploy(env, CREDENTIALS);

    expect(secrets).toEqual({ stripe: STRIPE.value });
  });

  it("returns nothing when there are no credentials", () => {
    const env = [{ name: "STRIPE_KEY", secret: "stripe" }];

    const secrets = secretsForDeploy(env, []);

    expect(secrets).toEqual({});
  });

  it.each([undefined, null, "stripe", 3, { name: "STRIPE_KEY", secret: "stripe" }])(
    "returns nothing when the env param is %j instead of a list",
    (env) => {
      const secrets = secretsForDeploy(env, CREDENTIALS);

      expect(secrets).toEqual({});
    },
  );

  it("ignores malformed entries and keeps the well-formed ones", () => {
    const env = [
      null,
      "stripe",
      7,
      { name: "NO_SECRET" },
      { name: "NUMERIC", secret: 5 },
      { name: "EMPTY", secret: "" },
      { secret: "database" },
      { name: "STRIPE_KEY", secret: "stripe" },
    ];

    const secrets = secretsForDeploy(env, CREDENTIALS);

    expect(secrets).toEqual({ stripe: STRIPE.value });
  });
});
