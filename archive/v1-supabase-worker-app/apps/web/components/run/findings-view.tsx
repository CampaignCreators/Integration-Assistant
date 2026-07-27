import type { FindingSide, ResearchFindingRow } from "@cc/shared";

const SIDE_LABELS: Record<FindingSide, string> = {
  hubspot: "HubSpot side",
  target: "The other software",
  marketplace: "Ready-made integration",
  middleware: "Make / Zapier",
};

const SIDE_ORDER: FindingSide[] = ["target", "marketplace", "middleware", "hubspot"];

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800",
  medium: "bg-amber-50 text-amber-800",
  low: "bg-red-50 text-red-800",
};

interface Details {
  api_verdict?: string;
  api_verdict_reason?: string;
  native_app_exists?: boolean;
  reviews_summary?: string | null;
  rating?: string | null;
  listing_url?: string | null;
  limitations?: { limitation: string; blocking: boolean; source: string | null }[];
  verdict?: string;
  vendor_action_required?: string | null;
  open_questions?: string[];
}

const API_VERDICT_COPY: Record<string, string> = {
  available: "Has a usable public API",
  limited: "API exists but is limited or gated",
  none_found: "No public API found",
};

const MIDDLEWARE_VERDICT_COPY: Record<string, string> = {
  viable: "Make or Zapier can connect this",
  not_viable_no_connector: "Neither Make nor Zapier can reach this system",
  not_applicable: "Not needed — the software has its own API",
};

/**
 * Research findings with their citations. Every finding shows its sources, and
 * anything the research could not confirm appears as an open question rather
 * than as a fact (spec §8.2, acceptance criterion 6).
 */
export function FindingsView({ findings }: { findings: ResearchFindingRow[] }) {
  const bySide = new Map(findings.map((f) => [f.side, f]));

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">What we found</h2>

      {SIDE_ORDER.filter((side) => bySide.has(side)).map((side) => {
        const finding = bySide.get(side)!;
        const details = (finding.details_json ?? {}) as Details;

        return (
          <section
            key={side}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{SIDE_LABELS[side]}</h3>
              {finding.confidence ? (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    CONFIDENCE_STYLES[finding.confidence] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {finding.confidence} confidence
                </span>
              ) : null}
            </div>

            <Headline details={details} side={side} />

            <p className="mt-3 text-sm text-slate-700">{finding.summary}</p>

            {details.limitations && details.limitations.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Known limitations
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {details.limitations.map((item) => (
                    <li key={item.limitation} className="flex items-start gap-2">
                      {item.blocking ? (
                        <span className="mt-0.5 shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
                          blocker
                        </span>
                      ) : null}
                      <span>{item.limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {details.reviews_summary ? (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  What users say {details.rating ? `· ${details.rating}` : ""}
                </h4>
                <p className="mt-1 text-sm text-slate-700">{details.reviews_summary}</p>
              </div>
            ) : null}

            {details.vendor_action_required ? (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <strong className="font-semibold">What to do instead: </strong>
                {details.vendor_action_required}
              </div>
            ) : null}

            {details.open_questions && details.open_questions.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Open questions
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                  {details.open_questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {finding.sources.length > 0 ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sources ({finding.sources.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {finding.sources.map((source) => (
                    <li key={source}>
                      <a
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-blue-700 hover:underline"
                      >
                        {source}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="mt-4 text-xs text-amber-700">
                No sources recorded — treat this section as unverified.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Headline({ details, side }: { details: Details; side: FindingSide }) {
  if (side === "target" && details.api_verdict) {
    return (
      <p className="mt-2 text-sm font-medium">
        {API_VERDICT_COPY[details.api_verdict] ?? details.api_verdict}
      </p>
    );
  }
  if (side === "marketplace") {
    return (
      <p className="mt-2 text-sm font-medium">
        {details.native_app_exists ? (
          details.listing_url ? (
            <a
              href={details.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
            >
              A native HubSpot app exists →
            </a>
          ) : (
            "A native HubSpot app exists"
          )
        ) : (
          "No native HubSpot app found"
        )}
      </p>
    );
  }
  if (side === "middleware" && details.verdict) {
    return (
      <p className="mt-2 text-sm font-medium">
        {MIDDLEWARE_VERDICT_COPY[details.verdict] ?? details.verdict}
      </p>
    );
  }
  return null;
}
