import { NextResponse, type NextRequest } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/**
 * Proxies the worker's signed-upload-URL endpoint. The browser needs this
 * because WORKER_BASE_URL is server-only; the worker still authorizes the
 * caller's session and run ownership.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = await workerFetch(`/runs/${id}/upload-url`, {
      method: "POST",
      body,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Upload could not be started" }, { status: 500 });
  }
}
