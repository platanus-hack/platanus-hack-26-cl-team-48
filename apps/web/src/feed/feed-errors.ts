import { err } from "@nodomics/protocol";
import type { FeedError, FeedErrorCode } from "./feed-service.ts";

export const feedFailure = (code: FeedErrorCode, issues?: FeedError["issues"]) =>
  err<FeedError>(issues === undefined ? { code } : { code, issues });
