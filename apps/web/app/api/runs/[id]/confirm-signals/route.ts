import { NextResponse, type NextRequest } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Accepts the extracted signals and kicks off the research phase. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = await workerFetch(`/runs/${id}/confirm-signals`, {
      method: "POST",
      body,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not start research" }, { status: 500 });
  }
}
