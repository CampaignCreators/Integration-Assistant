import { NextResponse } from "next/server";
import { draftToRow, rowToSummary } from "@/lib/runs";
import { createClient } from "@/lib/supabase/server";

/**
 * Saved runs. Only reachable when Supabase is configured — without it the app
 * keeps its single draft in the browser and never calls this.
 */

const SUMMARY_COLUMNS = "id, title, target_software, confirmed, updated_at";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ runs: [] });

  const { data, error } = await supabase
    .from("runs")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("listing runs failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A row the app can no longer read is skipped rather than breaking the list.
  const runs = (data ?? []).map(rowToSummary).filter((run) => run !== null);
  return NextResponse.json({ runs });
}

/** Creates a run. Called as soon as one is started, so uploads have an id. */
export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Saving is not configured." }, { status: 501 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = body.draft as Parameters<typeof draftToRow>[0] | undefined;

  const { data, error } = await supabase
    .from("runs")
    .insert({ ...(draft ? draftToRow(draft) : {}), user_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("creating a run failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
