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
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            done ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"
          }`}
          aria-hidden
        >
          {done ? "✓" : step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
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
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300",
    secondary:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400",
    ghost: "text-slate-600 hover:text-slate-900 hover:underline",
  }[variant];

  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${
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
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "warn" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-slate-100 text-slate-700",
    error: "bg-red-50 text-red-800",
    warn: "bg-amber-50 text-amber-900",
    success: "bg-emerald-50 text-emerald-800",
  }[tone];
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${styles}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
        aria-hidden
      />
      {label}
    </span>
  );
}
