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
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Integration Assistant</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to your saved runs.</p>

        <form action={signIn} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              {decodeURIComponent(error)}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-xs text-slate-500">
          Accounts are created in the Supabase dashboard under Authentication → Users.
        </p>
      </div>
    </main>
  );
}
