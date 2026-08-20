import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit" | "loss";
  sub?: string;
}) {
  const color =
    tone === "profit"
      ? "text-emerald-600"
      : tone === "loss"
        ? "text-rose-600"
        : "text-zinc-900";
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-zinc-500">{sub}</div> : null}
    </Card>
  );
}

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "green" | "red" | "blue";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "red"
        ? "bg-rose-100 text-rose-700"
        : tone === "blue"
          ? "bg-sky-100 text-sky-700"
          : "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-lg font-semibold text-zinc-900">{children}</h2>
  );
}