// The build-time variables the app reads (ADR 0018, ADR 0022, ADR 0027). All are public by design.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_AGENT_URL?: string;
  readonly VITE_DEPLOY_URL?: string;
}
