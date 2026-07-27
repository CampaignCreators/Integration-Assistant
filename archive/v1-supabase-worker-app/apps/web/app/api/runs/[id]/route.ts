import { NextResponse } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Deletes a run along with its uploaded files and generated documents. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await workerFetch(`/runs/${id}`, { method: "DELETE" });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not delete this run" }, { status: 500 });
  }
}
