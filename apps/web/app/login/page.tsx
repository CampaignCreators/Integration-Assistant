import { sendMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">CC Integration App</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your Campaign Creators email. We&apos;ll send you a magic
          link — no password needed.
        </p>

        {params.sent ? (
          <div
            className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
            role="status"
          >
            Check your email — we sent you a sign-in link.
          </div>
        ) : (
          <form action={sendMagicLink} className="mt-6 space-y-4">
            {params.error ? (
              <div
                className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
                role="alert"
              >
                {decodeURIComponent(params.error)}
              </div>
            ) : null}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Work email
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@campaigncreators.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
