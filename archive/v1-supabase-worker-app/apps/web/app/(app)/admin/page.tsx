import { redirect } from "next/navigation";
import type { AppSettingsRow, UserRow } from "@cc/shared";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";
import { AdminSettings } from "@/components/admin/admin-settings";
import { UserRoles } from "@/components/admin/user-roles";
import { UsageReport, type UsageResponse } from "@/components/admin/usage-report";

export const dynamic = "force-dynamic";

/**
 * Admin screen (spec §9): user management, runtime configuration, and usage
 * cost visibility. The worker enforces the admin role; a 403 sends non-admins
 * back to the dashboard rather than showing an empty shell.
 */
export default async function AdminPage() {
  let users: UserRow[];
  let usage: UsageResponse;
  let settings: AppSettingsRow;

  try {
    [{ users }, usage, { settings }] = await Promise.all([
      workerFetch<{ users: UserRow[] }>("/admin/users"),
      workerFetch<UsageResponse>("/admin/usage"),
      workerFetch<{ settings: AppSettingsRow }>("/admin/settings"),
    ]);
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 403) {
      redirect("/dashboard");
    }
    throw err;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-slate-600">
        Who can use the app, what it costs, and how many runs it processes at once.
      </p>

      <div className="mt-8 space-y-6">
        <UsageReport usage={usage} />
        <UserRoles users={users} />
        <AdminSettings settings={settings} />
      </div>
    </div>
  );
}
