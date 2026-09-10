import type { Distribution, ResponseOption } from "../types";

interface Props {
  /** Option id -> probability/proportion (0..1). Values come from the API. */
  distribution: Distribution;
  /** Option metadata for labels; ordering follows this list when provided. */
  options?: ResponseOption[];
  /** Optional raw counts to show alongside proportions. */
  counts?: Record<string, number>;
  /** Highlight the correct option id. */
  correctOption?: string;
  color?: "brand" | "slate";
}

const BAR_COLOR: Record<NonNullable<Props["color"]>, string> = {
  brand: "bg-brand-500",
  slate: "bg-slate-400",
};

export function DistributionBars({
  distribution,
  options,
  counts,
  correctOption,
  color = "brand",
}: Props) {
  const keys = options
    ? options.map((o) => o.id)
    : Object.keys(distribution);
  const max = Math.max(0.0001, ...keys.map((k) => distribution[k] ?? 0));

  return (
    <ul className="space-y-2">
      {keys.map((id) => {
        const value = distribution[id] ?? 0;
        const pct = Math.round(value * 100);
        const width = Math.round((value / max) * 100);
        const label = options?.find((o) => o.id === id)?.text;
        const isCorrect = correctOption === id;
        return (
          <li key={id} className="text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-xs font-semibold text-slate-600">
                  {id}
                </span>
                {label && <span className="text-slate-600">{label}</span>}
                {isCorrect && (
                  <span className="rounded bg-ok-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ok-500">
                    correct
                  </span>
                )}
              </span>
              <span className="tabular-nums text-slate-500">
                {pct}%
                {counts && counts[id] !== undefined ? ` (${counts[id]})` : ""}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  isCorrect ? "bg-ok-500" : BAR_COLOR[color]
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
