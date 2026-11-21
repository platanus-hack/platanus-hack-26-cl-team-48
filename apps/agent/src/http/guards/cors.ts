export type CorsOptions = {
  readonly allowedOrigins?: string | readonly string[];
};

export type CorsRequest = {
  readonly method: string;
  readonly origin?: string | undefined;
};

export type CorsDecision = {
  readonly isAllowed: boolean;
  readonly isPreflight: boolean;
  readonly status?: 204 | 403;
  readonly headers: Readonly<Record<string, string>>;
};

export type CorsGuard = {
  readonly evaluate: (request: CorsRequest) => CorsDecision;
};

const DEFAULT_METHODS = "GET, POST, OPTIONS";
const DEFAULT_HEADERS = "Content-Type, Authorization";

function parseOrigins(value: string | readonly string[] | undefined): Set<string> {
  if (!value) return new Set();
  const list = typeof value === "string" ? value.split(",") : value;
  return new Set(list.map((item) => item.trim()).filter((item) => item.length > 0));
}

function preflightDecision(origin: string, isAllowed: boolean): CorsDecision {
  return isAllowed
    ? {
        isAllowed: true,
        isPreflight: true,
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": DEFAULT_METHODS,
          "Access-Control-Allow-Headers": DEFAULT_HEADERS,
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      }
    : { isAllowed: false, isPreflight: true, status: 403, headers: {} };
}

export function createCorsGuard(options: CorsOptions = {}): CorsGuard {
  const allowed = parseOrigins(options.allowedOrigins ?? process.env["AGENT_ALLOWED_ORIGINS"]);

  const evaluate = (request: CorsRequest): CorsDecision => {
    const origin = request.origin ?? "";
    const isAllowed = allowed.has(origin);
    const isPreflight = request.method.toUpperCase() === "OPTIONS";

    if (isPreflight) return preflightDecision(origin, isAllowed);
    return isAllowed
      ? {
          isAllowed: true,
          isPreflight: false,
          headers: { "Access-Control-Allow-Origin": origin, Vary: "Origin" },
        }
      : { isAllowed: false, isPreflight: false, headers: {} };
  };

  return { evaluate };
}
