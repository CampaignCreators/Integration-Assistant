import { NextResponse, type NextRequest } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/**
 * Redirects to a short-lived signed download URL, so the browser downloads
 * straight from Supabase Storage rather than streaming through Vercel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; kind: string }> }
) {
  const { id, kind } = await params;
  const version = request.nextUrl.searchParams.get("version");
  const query = version ? `?version=${encodeURIComponent(version)}` : "";

  try {
    const { url } = await workerFetch<{ url: string }>(
      `/runs/${id}/deliverables/${kind}${query}`
    );
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
