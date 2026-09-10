import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  applyRepair,
  getItemAudit,
  getItemCandidates,
} from "../api/client";
import { Card } from "../components/Card";
import { ErrorBox, Loading, Sep } from "../components/Feedback";
import { PowerBadge } from "../components/PowerBadge";
import { useApi } from "../hooks/useApi";
import type { ApplyRepairResult } from "../types";

export function RepairRecommendation() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyRepairResult | null>(null);

  const { data, loading, error, reload } = useApi(
    async () => {
      const [rec, audit] = await Promise.all([
        getItemCandidates(id),
        getItemAudit(id),
      ]);
      return { rec, audit };
    },
    [id],
  );

  // Default the selection to the engine-recommended best candidate.
  const activeCandidateId =
    selectedId ?? data?.rec.best_candidate.candidate_id ?? null;

  async function onApply() {
    if (!activeCandidateId) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await applyRepair(id, activeCandidateId);
      setResult(res);
    } catch (err) {
      setApplyError((err as Error).message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          <header>
            <button
              type="button"
              onClick={() => navigate(`/items/${id}`)}
              className="mb-2 text-xs font-medium text-brand-600 hover:underline"
            >
              ← Back to item auditor
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Repair recommendation
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Ranked candidate items that could replace or supplement the
              current item. Rankings, predicted separability and improvement
              deltas are heuristic estimates from the backend engine, offered as
              illustrative prototype guidance.
            </p>
          </header>

          {/* Summary block */}
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryRow
                label="Current item"
                value={`${data.audit.item.id} · ${data.audit.item.question}`}
              />
              <SummaryRow
                label="Current diagnostic power"
                value={
                  <span className="flex items-center gap-2">
                    <Sep value={data.rec.current_separability} />
                    <PowerBadge band={data.rec.current_power_band} />
                  </span>
                }
              />
              <SummaryRow
                label="Blind spot"
                value={
                  data.audit.analysis.blind_spot
                    ? `${data.audit.analysis.blind_spot.state_a} vs ${data.audit.analysis.blind_spot.state_b} (sep ${data.audit.analysis.blind_spot.separability.toFixed(2)})`
                    : "None detected"
                }
              />
              <SummaryRow
                label="Recommended repair"
                value={`${data.rec.best_candidate.candidate_id} · ${data.rec.best_candidate.question}`}
              />
              <SummaryRow
                label="Predicted separability"
                value={
                  <span className="flex items-center gap-2">
                    <Sep value={data.rec.best_candidate.overall_separability} />
                    <PowerBadge band={data.rec.best_candidate.power_band} />
                  </span>
                }
              />
              <SummaryRow
                label="Improvement (predicted)"
                value={
                  <span className="font-semibold text-ok-500">
                    {data.rec.best_candidate.improvement >= 0 ? "+" : ""}
                    {data.rec.best_candidate.improvement.toFixed(2)}
                  </span>
                }
              />
            </div>
            <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
              <span className="font-semibold">Reason: </span>
              {data.rec.rationale}
            </div>
          </Card>

          {/* Candidate list */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Candidate items (ranked)
            </h3>
            <div className="space-y-3">
              {data.rec.all_candidates.map((c) => {
                const isSelected = c.candidate_id === activeCandidateId;
                return (
                  <Card
                    key={c.candidate_id}
                    className={`p-5 ${
                      c.is_best_separator
                        ? "border-ok-500 ring-2 ring-ok-500/30"
                        : isSelected
                          ? "border-brand-500 ring-2 ring-brand-500/20"
                          : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Rank {c.rank}
                          </span>
                          <span className="text-xs text-slate-400">
                            {c.candidate_id}
                          </span>
                          <PowerBadge band={c.power_band} />
                          {c.is_best_separator && (
                            <span className="rounded-full bg-ok-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ok-500">
                              ★ Best separator
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-base font-semibold text-slate-900">
                          {c.question}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {c.intended_purpose}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                          <Metric
                            label="Predicted separability"
                            value={c.overall_separability.toFixed(2)}
                          />
                          <Metric
                            label="Target-pair separation"
                            value={c.target_pair_separability.toFixed(2)}
                          />
                          <Metric
                            label="Improvement"
                            value={`${c.improvement >= 0 ? "+" : ""}${c.improvement.toFixed(2)}`}
                            accent={c.improvement >= 0 ? "ok" : "bad"}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.candidate_id)}
                        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${
                          isSelected
                            ? "bg-brand-600 text-white"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Apply repair + before/after */}
          <Card className="p-5">
            <CardHeaderInline />
            {applyError && (
              <div className="mb-3">
                <ErrorBox message={applyError} />
              </div>
            )}
            {!result ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Applying adds the selected candidate (
                  <span className="font-medium">{activeCandidateId}</span>) to
                  the assessment and shows a predicted before → after
                  comparison. This is an illustrative prototype action.
                </p>
                <button
                  type="button"
                  onClick={onApply}
                  disabled={applying || !activeCandidateId}
                  className="shrink-0 rounded-lg bg-ok-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
                >
                  {applying ? "Applying…" : "Apply Repair"}
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                  <BeforeAfterCard
                    heading="Before (current item)"
                    itemId={result.repaired_item_id}
                    separability={result.before_separability}
                    band={result.before_power_band}
                    tone="bad"
                  />
                  <div className="text-center text-2xl font-bold text-slate-400">
                    →
                  </div>
                  <BeforeAfterCard
                    heading="After (with repair)"
                    itemId={result.added_item_id}
                    separability={result.after_separability}
                    band={result.after_power_band}
                    tone="ok"
                  />
                </div>
                <p className="mt-4 text-center text-sm text-slate-600">
                  Predicted change in separability:{" "}
                  <span className="font-semibold text-ok-500">
                    {result.delta >= 0 ? "+" : ""}
                    {result.delta.toFixed(2)}
                  </span>{" "}
                  (heuristic, illustrative — not a validated or guaranteed
                  gain).
                </p>
                <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  {result.message}
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function CardHeaderInline() {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-900">Apply repair</h3>
      <p className="text-xs text-slate-500">
        Predicted before → after comparison from the engine
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-slate-800">{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string;
  accent?: "slate" | "ok" | "bad";
}) {
  const color =
    accent === "ok"
      ? "text-ok-500"
      : accent === "bad"
        ? "text-bad-500"
        : "text-slate-900";
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function BeforeAfterCard({
  heading,
  itemId,
  separability,
  band,
  tone,
}: {
  heading: string;
  itemId: string;
  separability: number;
  band: "HIGH" | "MEDIUM" | "LOW";
  tone: "ok" | "bad";
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${
        tone === "ok"
          ? "border-ok-500/40 bg-ok-100"
          : "border-bad-500/40 bg-bad-100"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {heading}
      </p>
      <p className="mt-1 text-xs text-slate-500">{itemId}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">
        {separability.toFixed(2)}
      </p>
      <div className="mt-2 flex justify-center">
        <PowerBadge band={band} />
      </div>
    </div>
  );
}
