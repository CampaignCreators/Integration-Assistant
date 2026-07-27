import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  port: Number(process.env.PORT ?? 8080),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 3000),
};
