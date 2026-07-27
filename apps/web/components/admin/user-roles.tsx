"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserRole, UserRow } from "@cc/shared";

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  rep: "Can create runs and see their own",
  reviewer: "Can see and correct every run",
  admin: "Full access, including this screen",
};

export function UserRoles({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function changeRole(userId: string, role: UserRole) {
    setPending(userId);
    setError(null);
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not update that role.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">People</h2>
      <p className="mt-1 text-sm text-slate-600">
        Anyone who signs in gets the rep role. Promote reviewers so they can correct
        other people&apos;s runs.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-slate-100">
        {users.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[user.role]}</p>
            </div>
            <select
              aria-label={`Role for ${user.email}`}
              value={user.role}
              disabled={pending === user.id}
              onChange={(e) => void changeRole(user.id, e.target.value as UserRole)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
            >
              <option value="rep">Rep</option>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
            </select>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        You cannot change your own role — that stops the last admin locking everyone out.
      </p>
    </section>
  );
}
