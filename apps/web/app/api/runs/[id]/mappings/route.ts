import { NextResponse, type NextRequest } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Reviewer corrections to the mapping table. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = await workerFetch(`/runs/${id}/mappings`, { method: "PATCH", body });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not save your changes" }, { status: 500 });
  }
}
