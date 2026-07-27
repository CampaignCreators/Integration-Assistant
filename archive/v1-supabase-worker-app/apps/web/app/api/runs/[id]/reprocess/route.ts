import { NextResponse } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Re-runs research using the files and answers already captured. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await workerFetch(`/runs/${id}/reprocess`, { method: "POST" });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not re-run the research" }, { status: 500 });
  }
}
