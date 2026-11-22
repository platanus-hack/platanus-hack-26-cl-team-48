/** The signed-in user's access token, for services that verify it with the hub's auth (ADR 0021). */
export interface SessionToken {
  accessToken(): Promise<string | undefined>;
}
