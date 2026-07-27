import { NextResponse } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Rebuilds both deliverables from the current mapping rows. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await workerFetch(`/runs/${id}/generate`, { method: "POST" });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not rebuild the documents" }, { status: 500 });
  }
}
