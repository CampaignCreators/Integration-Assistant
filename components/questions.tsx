"use client";

import { useState } from "react";
import type { Question } from "@/lib/schemas";
import { Button, Notice, Spinner, inputClass } from "./ui";

/**
 * Shown when the analysis needs more before it can map anything.
 *
 * Suggested answers are clickable because the common case is picking one of three
 * options, and a rep should not have to type a sentence to say "email address".
 */
export function Questions({
  reason,
  questions,
  busy,
  onSubmit,
}: {
  reason: string;
  questions: Question[];
  busy: boolean;
  onSubmit: (answers: { question: string; answer: string }[]) => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));

  const answered = answers.filter((answer) => answer.trim().length > 0).length;

  return (
    <div className="space-y-5">
      <Notice tone="warn">{reason}</Notice>

      {questions.map((question, index) => (
        <div key={question.question} className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">{question.question}</p>
          <p className="mt-1 text-xs text-slate-500">{question.why}</p>

          {question.suggestions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.suggestions.map((suggestion) => {
                const selected = answers[index] === suggestion;
                return (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setAnswers((current) =>
                        current.map((value, i) =>
                          i === index ? (value === suggestion ? "" : suggestion) : value
                        )
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          ) : null}

          <input
            className={`${inputClass} mt-3`}
            placeholder="Or type your own answer"
            value={answers[index] ?? ""}
            disabled={busy}
            onChange={(event) =>
              setAnswers((current) =>
                current.map((value, i) => (i === index ? event.target.value : value))
              )
            }
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button
          disabled={busy || answered === 0}
          onClick={() =>
            onSubmit(
              questions
                .map((question, index) => ({
                  question: question.question,
                  answer: (answers[index] ?? "").trim(),
                }))
                .filter((entry) => entry.answer.length > 0)
            )
          }
        >
          Continue
        </Button>
        {busy ? <Spinner label="Drafting the mapping…" /> : null}
        {!busy && answered < questions.length ? (
          <span className="text-xs text-slate-500">
            Anything you leave blank becomes a recorded assumption.
          </span>
        ) : null}
      </div>
    </div>
  );
}
