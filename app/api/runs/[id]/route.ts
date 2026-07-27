import { NextResponse } from "next/server";
import { draftToRow, rowToDraft } from "@/lib/runs";
import { createClient } from "@/lib/supabase/server";

/**
 * One saved run: open it, save it, delete it.
 *
 * Every query runs as the signed-in user, so row-level security decides what is
 * reachable — an id belonging to someone else simply isn't found.
 */

const COLUMNS =
  "id, title, target_software, use_case, notes, documents, answers, questions, mapping, confirmed, round, demo, updated_at";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const { data, error } = await supabase.from("runs").select(COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    console.error("loading a run failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  const draft = rowToDraft(data);
  if (!draft) {
    return NextResponse.json(
      { error: "This run was saved in a format this version cannot open." },
      { status: 422 }
    );
  }

  return NextResponse.json({ draft });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = body.draft as Parameters<typeof draftToRow>[0] | undefined;
  if (!draft) return NextResponse.json({ error: "No draft supplied." }, { status: 400 });

  const { data, error } = await supabase
    .from("runs")
    .update(draftToRow(draft))
    .eq("id", id)
    .select("id, updated_at")
    .maybeSingle();

  if (error) {
    console.error("saving a run failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  return NextResponse.json({ saved_at: data.updated_at });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Files first: the row is the only record of where they are, so deleting it
  // first would leave uploads behind with nothing pointing at them.
  const { data: existing } = await supabase
    .from("runs")
    .select("documents")
    .eq("id", id)
    .maybeSingle();

  const paths = ((existing?.documents ?? []) as { storage_path?: string | null }[])
    .map((doc) => doc.storage_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("uploads").remove(paths);
    if (storageError) console.error("removing uploads failed", storageError);
  }

  const { error } = await supabase.from("runs").delete().eq("id", id);
  if (error) {
    console.error("deleting a run failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, files_removed: paths.length });
}
