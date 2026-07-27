import { NextResponse, type NextRequest } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Registers files that the browser already uploaded to Supabase Storage. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = await workerFetch(`/runs/${id}/uploads`, { method: "POST", body });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Files could not be saved" }, { status: 500 });
  }
}
