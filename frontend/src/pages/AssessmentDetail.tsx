import { useNavigate, useParams } from "react-router-dom";
import { getAssessment, getAssessmentAudit } from "../api/client";
import { Card } from "../components/Card";
import { ErrorBox, Loading, Sep } from "../components/Feedback";
import { PowerBadge } from "../components/PowerBadge";
import { useApi } from "../hooks/useApi";
import type { ItemAuditSummary } from "../types";

export function AssessmentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useApi(
    async () => {
      const [assessment, audit] = await Promise.all([
        getAssessment(id),
        getAssessmentAudit(id),
      ]);
      return { assessment, audit };
    },
    [id],
  );

  const auditByItem = new Map<string, ItemAuditSummary>();
  data?.audit.items.forEach((i) => auditByItem.set(i.item_id, i));

  return (
    <div className="space-y-6">
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          <header>
            <button
              type="button"
              onClick={() => navigate("/assessments")}
              className="mb-2 text-xs font-medium text-brand-600 hover:underline"
            >
              ← All assessments
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              {data.assessment.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Domain: {data.assessment.domain} · {data.audit.item_count} items ·{" "}
              {data.audit.blind_spot_count} blind spot
              {data.audit.blind_spot_count === 1 ? "" : "s"} ·{" "}
              {data.audit.band_counts.HIGH} high / {data.audit.band_counts.MEDIUM}{" "}
              medium / {data.audit.band_counts.LOW} low
            </p>
          </header>

          <div className="space-y-4">
            {data.assessment.items.map((item) => {
              const summary = auditByItem.get(item.id);
              return (
                <Card key={item.id} className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {item.id}
                        </span>
                        {summary && <PowerBadge band={summary.power_band} />}
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-slate-900">
                        {item.question}
                      </h3>
                      {summary && (
                        <p className="mt-1 text-sm text-slate-500">
                          Overall separability{" "}
                          <Sep value={summary.overall_separability} /> · weakest
                          pair {summary.weakest_pair.state_a} vs{" "}
                          {summary.weakest_pair.state_b} (
                          <Sep value={summary.weakest_pair.separability} />)
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-xs text-slate-400">
                          Target states:
                        </span>
                        {item.targetStates.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/items/${item.id}`)}
                      className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Inspect item →
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
