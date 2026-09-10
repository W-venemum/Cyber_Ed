import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getItemAudit, getStates, getThresholds } from "../api/client";
import { Card, CardHeader } from "../components/Card";
import { DistributionBars } from "../components/DistributionBars";
import { ErrorBox, Loading, Sep } from "../components/Feedback";
import { PowerBadge } from "../components/PowerBadge";
import { useApi } from "../hooks/useApi";
import type { MisconceptionState } from "../types";

export function ItemAuditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [explainOpen, setExplainOpen] = useState(false);

  const { data, loading, error, reload } = useApi(
    async () => {
      const [audit, states, thresholds] = await Promise.all([
        getItemAudit(id),
        getStates(),
        getThresholds(),
      ]);
      return { audit, states, thresholds };
    },
    [id],
  );

  const stateName = (states: MisconceptionState[], sid: string) =>
    states.find((s) => s.id === sid)?.name ?? sid;

  return (
    <div className="space-y-6">
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          <header>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-2 text-xs font-medium text-brand-600 hover:underline"
            >
              ← Back
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Item Auditor · {data.audit.item.id}
              </h1>
              <PowerBadge band={data.audit.analysis.power_band} descriptive />
            </div>
            <p className="mt-1 text-lg text-slate-700">
              {data.audit.item.question}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* LEFT: question, options, observed responses */}
            <Card>
              <CardHeader
                title="Question & responses"
                subtitle="What learners were shown and how they answered"
              />
              <div className="space-y-5 p-5">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Answer options
                  </p>
                  <ul className="space-y-2">
                    {data.audit.item.options.map((o) => (
                      <li
                        key={o.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                          o.id === data.audit.item.correctOption
                            ? "border-ok-500/30 bg-ok-100"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-xs font-semibold text-slate-600">
                            {o.id}
                          </span>
                          <span className="text-slate-700">{o.text}</span>
                        </span>
                        {o.state && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                            {o.state}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {data.audit.observed && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Observed response distribution
                    </p>
                    <p className="mb-3 inline-block rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      {data.audit.observed.label} ·{" "}
                      {data.audit.observed.total_responses} responses
                    </p>
                    <DistributionBars
                      distribution={data.audit.observed.proportions}
                      counts={data.audit.observed.counts}
                      options={data.audit.item.options}
                      correctOption={data.audit.item.correctOption}
                      color="slate"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* CENTER: misconception mapping + diagnostic analysis */}
            <Card>
              <CardHeader
                title="Misconception mapping"
                subtitle="Predicted answer distribution per misconception state"
              />
              <div className="space-y-5 p-5">
                {data.audit.analysis.target_states.map((sid) => (
                  <div key={sid}>
                    <p className="mb-2 text-xs font-semibold text-slate-700">
                      <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">
                        {sid}
                      </span>{" "}
                      {stateName(data.states, sid)}
                    </p>
                    <DistributionBars
                      distribution={
                        data.audit.mapping.distributions[sid] ?? {}
                      }
                      options={data.audit.item.options}
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* RIGHT: diagnostic power, blind spot, explanation */}
            <div className="space-y-5">
              <Card>
                <CardHeader title="Diagnostic power" />
                <div className="space-y-3 p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900 tabular-nums">
                      {data.audit.analysis.overall_separability.toFixed(2)}
                    </span>
                    <PowerBadge band={data.audit.analysis.power_band} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Overall separability (0–1). Higher means the item better
                    distinguishes the target misconceptions.
                  </p>
                  <p className="text-sm text-slate-600">
                    {data.audit.analysis.explanation}
                  </p>
                </div>
              </Card>

              {data.audit.analysis.blind_spot && (
                <Card className="border-bad-500/30">
                  <CardHeader
                    title="Blind spot"
                    subtitle={`${data.audit.analysis.blind_spot.state_a} vs ${data.audit.analysis.blind_spot.state_b}`}
                    right={
                      <span className="rounded-full bg-bad-100 px-2.5 py-0.5 text-xs font-semibold text-bad-500">
                        sep{" "}
                        <Sep
                          value={data.audit.analysis.blind_spot.separability}
                        />
                      </span>
                    }
                  />
                  <div className="space-y-3 p-5 text-sm text-slate-600">
                    <p>{data.audit.analysis.blind_spot.explanation}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-slate-700">
                          {data.audit.analysis.blind_spot.state_a}{" "}
                          <span className="font-normal text-slate-400">
                            {stateName(
                              data.states,
                              data.audit.analysis.blind_spot.state_a,
                            )}
                          </span>
                        </p>
                        <DistributionBars
                          distribution={
                            data.audit.analysis.blind_spot.distribution_a
                          }
                          options={data.audit.item.options}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold text-slate-700">
                          {data.audit.analysis.blind_spot.state_b}{" "}
                          <span className="font-normal text-slate-400">
                            {stateName(
                              data.states,
                              data.audit.analysis.blind_spot.state_b,
                            )}
                          </span>
                        </p>
                        <DistributionBars
                          distribution={
                            data.audit.analysis.blind_spot.distribution_b
                          }
                          options={data.audit.item.options}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <button
                type="button"
                onClick={() => navigate(`/items/${data.audit.item.id}/repair`)}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Find strongest repair →
              </button>
            </div>
          </div>

          {/* Explain / Why? */}
          <Card>
            <button
              type="button"
              onClick={() => setExplainOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-slate-900">
                Explain / Why? — state definitions, distributions & pairwise
                separability
              </span>
              <span className="text-slate-400">{explainOpen ? "▲" : "▼"}</span>
            </button>

            {explainOpen && (
              <div className="space-y-6 border-t border-slate-100 p-5">
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Misconception state definitions
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {data.audit.analysis.target_states.map((sid) => {
                      const st = data.states.find((s) => s.id === sid);
                      return (
                        <li key={sid} className="rounded-lg bg-slate-50 p-3">
                          <span className="font-semibold text-slate-800">
                            {sid} · {st?.name ?? sid}
                          </span>
                          <p className="mt-0.5 text-slate-600">
                            {st?.description}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pairwise separability (Jensen–Shannon divergence, 0–1)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-4 font-medium">State pair</th>
                          <th className="py-2 pr-4 font-medium">Separability</th>
                          <th className="py-2 font-medium">Reading</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.audit.analysis.pairwise.map((p) => {
                          const isWeakest =
                            p.state_a ===
                              data.audit.analysis.weakest_pair.state_a &&
                            p.state_b ===
                              data.audit.analysis.weakest_pair.state_b;
                          return (
                            <tr
                              key={`${p.state_a}-${p.state_b}`}
                              className={isWeakest ? "bg-bad-100/50" : ""}
                            >
                              <td className="py-2 pr-4 font-medium text-slate-700">
                                {p.state_a} vs {p.state_b}
                                {isWeakest && (
                                  <span className="ml-2 rounded bg-bad-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-bad-500">
                                    weakest
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pr-4 tabular-nums text-slate-700">
                                {p.separability.toFixed(4)}
                              </td>
                              <td className="py-2 text-slate-500">
                                {p.separability >= data.thresholds.high_threshold
                                  ? "well separated"
                                  : p.separability >=
                                      data.thresholds.medium_threshold
                                    ? "partially separated"
                                    : "hard to distinguish"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
                  <p>
                    <span className="font-semibold">Final score: </span>
                    overall separability{" "}
                    <Sep value={data.audit.analysis.overall_separability} /> ={" "}
                    equal-weight mean of the{" "}
                    {data.audit.analysis.pairwise.length} pairwise values above,
                    placing this item in the{" "}
                    <span className="font-semibold">
                      {data.audit.analysis.power_band}
                    </span>{" "}
                    heuristic band. All values are computed by the backend
                    engine.
                  </p>
                </section>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
