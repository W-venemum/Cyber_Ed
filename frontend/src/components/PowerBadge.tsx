import type { PowerBand } from "../types";

const STYLES: Record<PowerBand, string> = {
  HIGH: "bg-ok-100 text-ok-500 ring-ok-500/30",
  MEDIUM: "bg-warn-100 text-warn-500 ring-warn-500/30",
  LOW: "bg-bad-100 text-bad-500 ring-bad-500/30",
};

const LABEL: Record<PowerBand, string> = {
  HIGH: "High diagnostic power",
  MEDIUM: "Medium diagnostic power",
  LOW: "Low diagnostic power",
};

interface Props {
  band: PowerBand;
  /** When true, shows the full descriptive label instead of just the band. */
  descriptive?: boolean;
  className?: string;
}

export function PowerBadge({ band, descriptive = false, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${STYLES[band]} ${className}`}
      title={LABEL[band]}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          band === "HIGH"
            ? "bg-ok-500"
            : band === "MEDIUM"
              ? "bg-warn-500"
              : "bg-bad-500"
        }`}
      />
      {descriptive ? LABEL[band] : band}
    </span>
  );
}
