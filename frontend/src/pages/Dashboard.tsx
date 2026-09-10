import { useNavigate } from "react-router-dom";
import { getAssessmentAudit } from "../api/client";
import { Card, StatCard } from "../components/Card";
import { ErrorBox, Loading, Sep } from "../components/Feedback";
import { PowerBadge } from "../components/PowerBadge";
import { DEMO_ASSESSMENT_ID, DEMO_WEAK_ITEM_ID } from "../constants";
import { useApi } from "../hooks/useApi";

export function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(
    () => getAssessmentAudit(DEMO_ASSESSMENT_ID),
    [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Assessment Auditor</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Audit multiple-choice diagnostics for how well they separate distinct
          misconceptions, surface blind spots, and suggest heuristic repair
          items. All scores are computed by the backend diagnostic engine.
        </p>
      </header>

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Demo assessment
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {data.title}
                </h2>
                <p className="text-sm text-slate-500">
                  Domain: {data.domain} · {data.item_count} items · Status:
                  analyzed
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/assessments/${data.assessment_id}`)
                  }
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  Audit Assessment
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/items/${DEMO_WEAK_ITEM_ID}`)
                  }
                  className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                >
                  Run Demo Audit →
                </button>
              </div>
            </div>
          </Card>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Audit summary
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Items analyzed" value={data.item_count} accent="brand" />
              <StatCard
                label="High diagnostic"
                value={data.band_counts.HIGH}
                accent="ok"
              />
              <StatCard
                label="Medium diagnostic"
                value={data.band_counts.MEDIUM}
                accent="warn"
              />
              <StatCard
                label="Low diagnostic"
                value={data.band_counts.LOW}
                accent="bad"
              />
              <StatCard
                label="Low-power items"
                value={data.low_power_item_count}
                accent="bad"
              />
              <StatCard
                label="Repairs recommended"
                value={data.band_counts.LOW}
                accent="brand"
                hint="One per low-power item"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Items at a glance
            </h3>
            <Card className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <button
                  key={item.item_id}
                  type="button"
                  onClick={() => navigate(`/items/${item.item_id}`)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="text-slate-400">{item.item_id} · </span>
                      {item.question}
                    </p>
                    <p className="text-xs text-slate-500">
                      Overall separability{" "}
                      <Sep value={item.overall_separability} /> · weakest pair{" "}
                      {item.weakest_pair.state_a} vs {item.weakest_pair.state_b}{" "}
                      (<Sep value={item.weakest_pair.separability} />)
                    </p>
                  </div>
                  <PowerBadge band={item.power_band} />
                </button>
              ))}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
