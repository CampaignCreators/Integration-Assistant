import { NextResponse, type NextRequest } from "next/server";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

/** Changes runtime settings such as the concurrent-run cap. Admin-only. */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await workerFetch("/admin/settings", { method: "PATCH", body });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
  }
}
