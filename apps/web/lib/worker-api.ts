import { createClient } from "@/lib/supabase/server";

export class WorkerApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "WorkerApiError";
  }
}

/**
 * Server-side fetch to the Express worker, authenticated with the caller's
 * Supabase session JWT so the worker can enforce ownership/role.
 */
export async function workerFetch<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown }
): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new WorkerApiError("Not signed in", 401);
  }

  const base = process.env.WORKER_BASE_URL;
  if (!base) {
    throw new WorkerApiError("WORKER_BASE_URL is not configured", 500);
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Worker request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep default message
    }
    throw new WorkerApiError(message, response.status);
  }

  return (await response.json()) as T;
}
