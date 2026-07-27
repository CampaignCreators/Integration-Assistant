import { NextResponse } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Removes a file from a draft run (file picked by mistake). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  const { id, uploadId } = await params;
  try {
    const data = await workerFetch(`/runs/${id}/uploads/${uploadId}`, {
      method: "DELETE",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "File could not be removed" }, { status: 500 });
  }
}
