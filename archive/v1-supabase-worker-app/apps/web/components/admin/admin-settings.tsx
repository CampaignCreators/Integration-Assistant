"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppSettingsRow } from "@cc/shared";

export function AdminSettings({ settings }: { settings: AppSettingsRow }) {
  const router = useRouter();
  const [value, setValue] = useState(settings.max_concurrent_runs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_concurrent_runs: value }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not save that setting.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Settings</h2>

      <label className="mt-4 block max-w-md">
        <span className="text-sm font-medium text-slate-800">
          Runs processed at the same time
        </span>
        <input
          type="number"
          min={1}
          max={20}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Research is the expensive part of a run. A lower number keeps spend and rate-limit
          pressure predictable; a higher one clears a queue faster. Takes effect within
          about 30 seconds.
        </span>
      </label>

      {error ? (
        <p className="mt-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm text-emerald-800" role="status">
          Saved.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || value === settings.max_concurrent_runs}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
