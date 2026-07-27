/**
 * Placeholder config so importing modules that read env at load time (config,
 * supabase, llm/client) works under test. No network calls are made — the
 * Supabase and Anthropic clients are inert until a request is issued.
 */
process.env.SUPABASE_URL ??= "https://placeholder.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "placeholder-service-role-key";
process.env.ANTHROPIC_API_KEY ??= "placeholder-anthropic-key";
