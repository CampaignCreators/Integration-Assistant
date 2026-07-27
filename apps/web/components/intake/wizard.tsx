"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BriefRow, IntakeInput, RunRow, UploadRow } from "@cc/shared";
import { saveIntake, submitRun } from "@/app/(app)/runs/[id]/actions";
import { BriefStep } from "./brief-step";
import { ReviewStep } from "./review-step";
import { UploadStep } from "./upload-step";

const STEPS = ["Your files", "The integration", "Review & submit"] as const;

export function IntakeWizard({
  run,
  brief,
  uploads: initialUploads,
}: {
  run: RunRow;
  brief: BriefRow | null;
  uploads: UploadRow[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uploads, setUploads] = useState(initialUploads);
  const [intake, setIntake] = useState<IntakeInput>({
    target_software: run.target_software ?? undefined,
    direction: run.direction ?? undefined,
    frequency: run.frequency ?? undefined,
    description: brief?.description ?? undefined,
    objects: (brief?.objects ?? []) as IntakeInput["objects"],
    trigger_event: brief?.trigger_event ?? undefined,
    volume: brief?.volume ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function patchIntake(patch: Partial<IntakeInput>) {
    setIntake((prev) => ({ ...prev, ...patch }));
  }

  /** Persists answers before moving on, so a refresh never loses work. */
  async function goTo(nextStep: number) {
    setError(null);
    setProblems([]);
    if (nextStep > step) {
      const result = await saveIntake(run.id, intake);
      if (!result.ok) {
        setError(result.error ?? "Could not save your answers.");
        return;
      }
    }
    setStep(nextStep);
  }

  function handleSubmit() {
    setError(null);
    setProblems([]);
    startTransition(async () => {
      const saved = await saveIntake(run.id, intake);
      if (!saved.ok) {
        setError(saved.error ?? "Could not save your answers.");
        return;
      }
      const result = await submitRun(run.id);
      if (!result.ok) {
        setError(result.error ?? "Could not submit this run.");
        setProblems(result.problems ?? []);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void goTo(index)}
              aria-current={index === step ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                index === step
                  ? "bg-blue-600 text-white"
                  : index < step
                    ? "bg-blue-50 text-blue-800"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className="text-xs font-semibold">{index + 1}</span>
              {label}
            </button>
            {index < STEPS.length - 1 ? (
              <span aria-hidden className="text-slate-300">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 ? (
          <UploadStep runId={run.id} uploads={uploads} onUploadsChanged={setUploads} />
        ) : null}
        {step === 1 ? <BriefStep value={intake} onChange={patchIntake} /> : null}
        {step === 2 ? <ReviewStep value={intake} uploads={uploads} /> : null}
      </div>

      {error ? (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{error}</p>
          {problems.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => void goTo(step - 1)}
          disabled={step === 0 || isPending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:invisible"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => void goTo(step + 1)}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Submitting…" : "Submit and start research"}
          </button>
        )}
      </div>
    </div>
  );
}
