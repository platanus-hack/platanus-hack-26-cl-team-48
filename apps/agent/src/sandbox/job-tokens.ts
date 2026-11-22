import { randomBytes } from "node:crypto";

export const DEFAULT_JOB_TOKEN_TTL_MS = 15 * 60 * 1000;

export type Job = {
  readonly jobId: string;
  readonly userId: string;
  readonly accessToken: string;
};

export type IssueInput = Job;

export type IssuedToken = {
  readonly token: string;
};

type StoredJob = {
  readonly job: Job;
  readonly expiresAt: number;
};

export type JobTokensOptions = {
  readonly clock?: () => number;
  readonly ttlMs?: number;
};

export type JobTokens = {
  readonly issue: (input: IssueInput) => IssuedToken;
  readonly resolve: (token: string) => Job | null;
  readonly revoke: (jobId: string) => void;
};

export function createJobTokens(options: JobTokensOptions = {}): JobTokens {
  const clock = options.clock ?? Date.now;
  const ttlMs = options.ttlMs ?? DEFAULT_JOB_TOKEN_TTL_MS;
  const tokenToJob = new Map<string, StoredJob>();
  const jobToTokens = new Map<string, Set<string>>();

  const issue = (input: IssueInput): IssuedToken => {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = clock() + ttlMs;
    tokenToJob.set(token, { job: input, expiresAt });
    const tokens = jobToTokens.get(input.jobId) ?? new Set<string>();
    tokens.add(token);
    jobToTokens.set(input.jobId, tokens);
    return { token };
  };

  const resolve = (token: string): Job | null => {
    const entry = tokenToJob.get(token);
    if (!entry) return null;
    if (clock() > entry.expiresAt) {
      tokenToJob.delete(token);
      return null;
    }
    return entry.job;
  };

  const revoke = (jobId: string): void => {
    const tokens = jobToTokens.get(jobId);
    if (!tokens) return;
    for (const t of tokens) {
      tokenToJob.delete(t);
    }
    jobToTokens.delete(jobId);
  };

  return { issue, resolve, revoke };
}
