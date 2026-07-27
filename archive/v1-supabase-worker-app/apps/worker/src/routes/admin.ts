import { Router } from "express";
import {
  updateSettingsSchema,
  updateUserRoleSchema,
  type RunCostSummaryRow,
} from "@cc/shared";
import { invalidateSettingsCache } from "../lib/settings.js";
import { supabase } from "../lib/supabase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

// GET /admin/users — internal users and their roles.
adminRouter.get("/users", async (_req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, created_at, updated_at")
    .order("created_at");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ users: data });
});

// PATCH /admin/users/:userId — change a role.
adminRouter.patch("/users/:userId", async (req, res) => {
  const actor = req.user!;
  const targetId = req.params.userId;

  // Guard against an admin demoting themselves and locking the org out.
  if (targetId === actor.id) {
    res.status(400).json({ error: "You cannot change your own role" });
    return;
  }

  const parsed = updateUserRoleSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", targetId)
    .select("id, email, role")
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: data });
});

// GET /admin/usage — per-run cost rollup plus totals (spec §10).
adminRouter.get("/usage", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);

  const [runsResult, stepsResult, usersResult] = await Promise.all([
    supabase
      .from("run_cost_summary")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("usage_events").select("step, model, input_tokens, output_tokens, estimated_cost_usd"),
    supabase.from("users").select("id, email"),
  ]);

  if (runsResult.error) {
    res.status(500).json({ error: runsResult.error.message });
    return;
  }
  if (stepsResult.error) {
    res.status(500).json({ error: stepsResult.error.message });
    return;
  }

  const runs = (runsResult.data as RunCostSummaryRow[] | null) ?? [];
  const emails = new Map(
    ((usersResult.data as { id: string; email: string }[] | null) ?? []).map((u) => [
      u.id,
      u.email,
    ])
  );

  // Which steps cost the most, so an admin can see where the money goes.
  const byStep = new Map<string, { calls: number; cost: number; tokens: number }>();
  let totalCost = 0;
  let totalTokens = 0;
  for (const event of stepsResult.data ?? []) {
    const cost = Number(event.estimated_cost_usd ?? 0);
    const tokens = (event.input_tokens ?? 0) + (event.output_tokens ?? 0);
    totalCost += cost;
    totalTokens += tokens;
    const current = byStep.get(event.step) ?? { calls: 0, cost: 0, tokens: 0 };
    byStep.set(event.step, {
      calls: current.calls + 1,
      cost: current.cost + cost,
      tokens: current.tokens + tokens,
    });
  }

  res.json({
    totals: {
      runs: runs.length,
      cost_usd: round4(totalCost),
      tokens: totalTokens,
      average_cost_per_run: runs.length > 0 ? round4(totalCost / runs.length) : 0,
    },
    by_step: [...byStep.entries()]
      .map(([step, value]) => ({ step, ...value, cost: round4(value.cost) }))
      .sort((a, b) => b.cost - a.cost),
    runs: runs.map((run) => ({ ...run, user_email: emails.get(run.user_id) ?? null })),
  });
});

// GET /admin/settings — current runtime configuration.
adminRouter.get("/settings", async (_req, res) => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ settings: data });
});

// PATCH /admin/settings — change the concurrent-run cap.
adminRouter.patch("/settings", async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "Concurrent runs must be a whole number between 1 and 20",
    });
    return;
  }

  const { data, error } = await supabase
    .from("app_settings")
    .update({ max_concurrent_runs: parsed.data.max_concurrent_runs })
    .eq("id", true)
    .select("*")
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  invalidateSettingsCache();
  res.json({ settings: data });
});

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
