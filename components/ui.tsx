/** Small shared pieces, so the step components stay about their own step. */

export function Card({
  step,
  title,
  hint,
  children,
  done,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          // Mint behind navy is 9.4:1 — a done step reads as brand-green without
          // white-on-mint, which would be unreadable.
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            done ? "bg-mint text-navy" : "bg-navy text-white"
          }`}
          aria-hidden
        >
          {done ? "✓" : step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-ink">{hint}</p> : null}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary:
      "bg-navy text-white hover:bg-navy-dark disabled:bg-line disabled:text-muted focus-visible:ring-blue",
    secondary:
      "border border-navy bg-white text-navy hover:bg-navy-tint disabled:border-line disabled:text-muted focus-visible:ring-blue",
    ghost: "text-muted hover:text-navy hover:underline focus-visible:ring-blue",
  }[variant];

  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${styles} ${
        props.className ?? ""
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-navy">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted/70 focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "warn" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-shell text-ink",
    error: "bg-coral-tint text-coral-ink",
    warn: "bg-ember-tint text-ember-ink",
    success: "bg-mint-tint text-teal-ink",
  }[tone];
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm ${styles}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-navy"
        aria-hidden
      />
      {label}
    </span>
  );
}
