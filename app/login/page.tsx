import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // With no Supabase there is nothing to sign in to.
  if (!supabaseEnabled()) redirect("/");
  if (await currentUser()) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Integration Assistant</h1>
        <p className="mt-1 text-sm text-ink">Sign in to your saved runs.</p>

        <form action={signIn} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-lg bg-coral-tint p-3 text-sm text-coral-ink" role="alert">
              {decodeURIComponent(error)}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-navy">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-navy">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-xs text-muted">
          Accounts are created in the Supabase dashboard under Authentication → Users.
        </p>
      </div>
    </main>
  );
}
