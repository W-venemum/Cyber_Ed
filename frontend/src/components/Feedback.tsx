interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Loading from diagnostic engine…" }: LoadingProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label}
    </div>
  );
}

interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBox({ message, onRetry }: ErrorProps) {
  return (
    <div className="rounded-lg border border-bad-500/30 bg-bad-100 px-4 py-4 text-sm text-bad-500">
      <p className="font-semibold">Could not load data</p>
      <p className="mt-1 text-bad-500/90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-bad-500/40 bg-white px-3 py-1.5 text-xs font-medium text-bad-500 hover:bg-bad-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Sep({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toFixed(2)}</span>;
}
