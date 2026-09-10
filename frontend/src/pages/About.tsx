import { Card, CardHeader } from "../components/Card";
import { DISCLAIMER_TEXT } from "../constants";

export function About() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">About & method</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Assessment Auditor is an SIH 2026 prototype (Team Cyber Sentinels, PS
          26207) that helps teachers judge how well a multiple-choice diagnostic
          separates distinct misconceptions.
        </p>
      </header>

      <Card>
        <CardHeader title="The workflow: audit → explain → repair" />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <Step
            n="1"
            title="Audit"
            body="For each item the engine estimates how distinguishable the target misconception states are from one another, and assigns a diagnostic-power band."
          />
          <Step
            n="2"
            title="Explain"
            body="Every score is broken down into pairwise separability values and the specific state pair that is hardest to tell apart (the blind spot), with predicted distributions."
          />
          <Step
            n="3"
            title="Repair"
            body="Candidate replacement items are scored and ranked, highlighting the strongest separator and its predicted improvement over the current item."
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Separability formula" />
        <div className="space-y-3 p-5 text-sm text-slate-700">
          <p>
            Each misconception state is represented as a probability
            distribution over the answer options. To measure how distinguishable
            two states are on an item, we compute the{" "}
            <span className="font-semibold">Jensen–Shannon divergence</span>{" "}
            (JSD) between their predicted answer distributions.
          </p>
          <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-100">
            <p>M = ½ (P + Q)</p>
            <p>JSD(P ‖ Q) = ½ · KL(P ‖ M) + ½ · KL(Q ‖ M)</p>
            <p className="mt-2 text-slate-400">
              # KL uses log base 2, so JSD is symmetric and normalized to 0–1.
            </p>
          </div>
          <p>
            An item's <span className="font-semibold">overall separability</span>{" "}
            is the equal-weight mean of the pairwise JSD values across its target
            states. The lowest pairwise value is reported as the item's blind
            spot. All of this math runs in the backend engine, not in the
            browser.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Heuristic thresholds (demo defaults)" />
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-6 font-medium">Band</th>
                  <th className="py-2 pr-6 font-medium">
                    Overall separability
                  </th>
                  <th className="py-2 font-medium">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 pr-6 font-semibold text-ok-500">HIGH</td>
                  <td className="py-2 pr-6 tabular-nums">≥ 0.70</td>
                  <td className="py-2 text-slate-600">
                    Separates the target misconceptions well.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-semibold text-warn-500">
                    MEDIUM
                  </td>
                  <td className="py-2 pr-6 tabular-nums">0.40 – 0.69</td>
                  <td className="py-2 text-slate-600">
                    Partially diagnostic; some states overlap.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-semibold text-bad-500">LOW</td>
                  <td className="py-2 pr-6 tabular-nums">&lt; 0.40</td>
                  <td className="py-2 text-slate-600">
                    Weak; at least one state pair is hard to distinguish.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            These thresholds are heuristic demo defaults defined in the backend
            configuration, not psychometrically calibrated cut-offs.
          </p>
        </div>
      </Card>

      <Card className="border-amber-200">
        <CardHeader title="Responsible design & limitations" />
        <div className="space-y-3 p-5 text-sm text-slate-700">
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
            {DISCLAIMER_TEXT}
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              The engine is fully deterministic: no machine-learning model, no
              LLM, and no external AI service is used.
            </li>
            <li>
              Response data shown in the tool is illustrative demo data, not real
              student records. No personal or student data is collected or
              stored.
            </li>
            <li>
              Predicted improvements from applying a repair are heuristic
              estimates. The tool never claims that a change is proven,
              guaranteed, or validated.
            </li>
            <li>
              Output is intended to support a teacher's judgement about
              assessment quality, not to diagnose individual learners or certify
              instruments.
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {n}
        </span>
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
