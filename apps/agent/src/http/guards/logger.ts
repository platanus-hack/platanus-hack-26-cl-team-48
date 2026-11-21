export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerOptions = {
  readonly output?: (line: string) => void;
  readonly clock?: () => string;
};

export type StructuredLogger = {
  readonly log: (level: LogLevel, message: string, data?: Record<string, unknown>) => string;
  readonly debug: (message: string, data?: Record<string, unknown>) => string;
  readonly info: (message: string, data?: Record<string, unknown>) => string;
  readonly warn: (message: string, data?: Record<string, unknown>) => string;
  readonly error: (message: string, data?: Record<string, unknown>) => string;
};

const SENSITIVE_KEY_PATTERN =
  /^(authorization|access_token|accesstoken|refresh_token|refreshtoken|token|key|api_key|apikey|secret|password)$/i;

const VALUE_PATTERNS: readonly [RegExp, string][] = [
  [/(Bearer\s+)[^\s"']+/gi, "$1[REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\b/g, "[REDACTED]"],
  [/\b(sk-[A-Za-z0-9_-]{16,}|phk_[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_-]{16,})\b/g, "[REDACTED]"],
];

function sanitizeString(text: string): string {
  return VALUE_PATTERNS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text,
  );
}

function redactRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = SENSITIVE_KEY_PATTERN.test(k) ? "[REDACTED]" : redactSecrets(v);
  }
  return result;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (isRecord(value)) return redactRecord(value);
  return value;
}

export function createStructuredLogger(options: LoggerOptions = {}): StructuredLogger {
  const write = options.output ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = options.clock ?? (() => new Date().toISOString());

  const log = (level: LogLevel, message: string, data?: Record<string, unknown>): string => {
    const sanitized = data ? (redactSecrets(data) as Record<string, unknown>) : {};
    const line = JSON.stringify({ timestamp: now(), level, message, ...sanitized });
    write(line);
    return line;
  };

  return {
    log,
    debug: (msg, data) => log("debug", msg, data),
    info: (msg, data) => log("info", msg, data),
    warn: (msg, data) => log("warn", msg, data),
    error: (msg, data) => log("error", msg, data),
  };
}
