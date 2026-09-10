import { getItemAudit, getStates } from "../api/client";
import { Card } from "../components/Card";
import { ErrorBox, Loading } from "../components/Feedback";
import { DEMO_WEAK_ITEM_ID } from "../constants";
import { useApi } from "../hooks/useApi";
import type { ItemAuditResponse } from "../types";

// For a given state, find the option it is most likely to select (its modal
// option under the predicted distribution). Purely presentational; the
// distribution itself comes from the API.
function modalOption(audit: ItemAuditResponse, stateId: string): string | null {
  const dist = audit.mapping.distributions[stateId];
  if (!dist) return null;
  let best: string | null = null;
  let bestP = -1;
  for (const [optId, p] of Object.entries(dist)) {
    if (p > bestP) {
      bestP = p;
      best = optId;
    }
  }
  return best;
}

function optionText(audit: ItemAuditResponse, optId: string | null): string {
  if (!optId) return "—";
  const opt = audit.item.options.find((o) => o.id === optId);
  return opt ? `${opt.id} · ${opt.text}` : optId;
}

// Options explicitly mapped to a state via their `state` tag.
function mappedOptions(audit: ItemAuditResponse, stateId: string): string[] {
  return audit.item.options
    .filter((o) => o.state === stateId)
    .map((o) => `${o.id} (${o.text})`);
}

export function MisconceptionMap() {
  const { data, loading, error, reload } = useApi(
    async () => {
      const [states, audit] = await Promise.all([
        getStates(),
        getItemAudit(DEMO_WEAK_ITEM_ID),
      ]);
      return { states, audit };
    },
    [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Misconception map</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          The misconception states the engine reasons about, and how each one
          maps to answer options. "Typical response" and "Mapped options" are
          illustrated on the demo item{" "}
          <span className="font-medium">{DEMO_WEAK_ITEM_ID}</span> (
          {data?.audit.item.question ?? "…"}).
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
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">
                    Typical response (demo item)
                  </th>
                  <th className="px-5 py-3 font-medium">Mapped options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {data.states.map((s) => {
                  const mapped = mappedOptions(data.audit, s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          {s.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {s.name}
                      </td>
                      <td className="px-5 py-4 max-w-md text-slate-600">
                        {s.description}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {optionText(data.audit, modalOption(data.audit, s.id))}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {mapped.length ? (
                          <ul className="space-y-1">
                            {mapped.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">
                            (no direct option tag)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
