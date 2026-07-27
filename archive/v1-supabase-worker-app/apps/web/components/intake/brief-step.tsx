"use client";

import { useId, useState } from "react";
import type { HubSpotObject, IntakeInput } from "@cc/shared";
import {
  COMMON_TOOLS,
  DIRECTION_OPTIONS,
  FREQUENCY_OPTIONS,
  OBJECT_OPTIONS,
  TRIGGER_SUGGESTIONS,
  VOLUME_OPTIONS,
} from "@/lib/intake-options";

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-500">{children}</p>;
}

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-slate-800">
      {children}
      {optional ? (
        <span className="ml-2 font-normal text-slate-400">Optional</span>
      ) : null}
    </span>
  );
}

export function BriefStep({
  value,
  onChange,
}: {
  value: IntakeInput;
  onChange: (patch: Partial<IntakeInput>) => void;
}) {
  const listId = useId();
  const [objects, setObjects] = useState<HubSpotObject[]>(
    (value.objects ?? []) as HubSpotObject[]
  );

  function toggleObject(object: HubSpotObject) {
    const next = objects.includes(object)
      ? objects.filter((o) => o !== object)
      : [...objects, object];
    setObjects(next);
    onChange({ objects: next });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Tell us about the integration</h2>
        <p className="mt-1 text-sm text-slate-600">
          A few plain questions — no technical knowledge needed. Your answers
          shape the requirements document.
        </p>
      </div>

      <label className="block">
        <FieldLabel>What software should connect to HubSpot?</FieldLabel>
        <input
          type="text"
          list={listId}
          defaultValue={value.target_software ?? ""}
          onChange={(event) => onChange({ target_software: event.target.value })}
          placeholder="Start typing, e.g. Stripe"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <datalist id={listId}>
          {COMMON_TOOLS.map((tool) => (
            <option key={tool} value={tool} />
          ))}
        </datalist>
        <Hint>
          Pick from the list or type any tool name — we&apos;ll research it either
          way.
        </Hint>
      </label>

      <label className="block">
        <FieldLabel>In a sentence or two, what should this integration do?</FieldLabel>
        <textarea
          rows={3}
          defaultValue={value.description ?? ""}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="e.g. When a deal closes in HubSpot, create the customer and their first invoice in the billing system."
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Hint>Describe it the way you&apos;d explain it to the client.</Hint>
      </label>

      <fieldset>
        <legend>
          <FieldLabel>Which way should the data flow?</FieldLabel>
        </legend>
        <div className="mt-3 space-y-2">
          {DIRECTION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300"
            >
              <input
                type="radio"
                name="direction"
                value={option.value}
                defaultChecked={value.direction === option.value}
                onChange={() => onChange({ direction: option.value })}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <FieldLabel>What kinds of records are involved?</FieldLabel>
        </legend>
        <Hint>Choose everything that should move between the two systems.</Hint>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {OBJECT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300"
            >
              <input
                type="checkbox"
                checked={objects.includes(option.value)}
                onChange={() => toggleObject(option.value)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <FieldLabel>How often should it sync?</FieldLabel>
        </legend>
        <div className="mt-3 space-y-2">
          {FREQUENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300"
            >
              <input
                type="radio"
                name="frequency"
                value={option.value}
                defaultChecked={value.frequency === option.value}
                onChange={() => onChange({ frequency: option.value })}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <FieldLabel optional>What should kick off a sync?</FieldLabel>
        <input
          type="text"
          list={`${listId}-triggers`}
          defaultValue={value.trigger_event ?? ""}
          onChange={(event) => onChange({ trigger_event: event.target.value })}
          placeholder="e.g. A deal moves to Closed Won"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <datalist id={`${listId}-triggers`}>
          {TRIGGER_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <Hint>Leave blank if you&apos;re not sure — we&apos;ll suggest one.</Hint>
      </label>

      <fieldset>
        <legend>
          <FieldLabel optional>Roughly how many records?</FieldLabel>
        </legend>
        <Hint>A rough guess is fine. It affects the recommended approach.</Hint>
        <div className="mt-3 flex flex-wrap gap-2">
          {VOLUME_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                value.volume === option.value
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="volume"
                value={option.value}
                checked={value.volume === option.value}
                onChange={() => onChange({ volume: option.value })}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange({ volume: null })}
            className="rounded-full px-3 py-1.5 text-sm text-slate-500 underline hover:text-slate-700"
          >
            Not sure
          </button>
        </div>
      </fieldset>
    </div>
  );
}
