import { useNavigate } from "react-router-dom";
import { getAssessments } from "../api/client";
import { Card } from "../components/Card";
import { ErrorBox, Loading } from "../components/Feedback";
import { useApi } from "../hooks/useApi";

export function Assessments() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => getAssessments(), []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
        <p className="mt-1 text-sm text-slate-600">
          Diagnostics available for auditing. Open to inspect items, or audit to
          jump straight into the item-level analysis.
        </p>
      </header>

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Domain</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Blind spots</th>
                  <th className="px-5 py-3 font-medium">Last analyzed</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {a.title}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{a.domain}</td>
                    <td className="px-5 py-3 text-slate-600">{a.item_count}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {a.audit_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {a.blind_spot_count}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {a.last_analyzed}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/assessments/${a.id}`)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/assessments/${a.id}`)}
                          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          Audit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
