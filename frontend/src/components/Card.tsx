import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}

export function CardHeader({ title, subtitle, right }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  accent?: "brand" | "ok" | "warn" | "bad" | "slate";
  hint?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "text-brand-600",
  ok: "text-ok-500",
  warn: "text-warn-500",
  bad: "text-bad-500",
  slate: "text-slate-900",
};

export function StatCard({ label, value, accent = "slate", hint }: StatCardProps) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold ${ACCENTS[accent]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}
