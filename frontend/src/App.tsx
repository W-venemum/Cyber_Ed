import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { About } from "./pages/About";
import { AssessmentDetail } from "./pages/AssessmentDetail";
import { Assessments } from "./pages/Assessments";
import { Dashboard } from "./pages/Dashboard";
import { ItemAuditor } from "./pages/ItemAuditor";
import { MisconceptionMap } from "./pages/MisconceptionMap";
import { RepairRecommendation } from "./pages/RepairRecommendation";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/assessments/:id" element={<AssessmentDetail />} />
        <Route path="/items/:id" element={<ItemAuditor />} />
        <Route path="/items/:id/repair" element={<RepairRecommendation />} />
        <Route path="/misconceptions" element={<MisconceptionMap />} />
        <Route path="/about" element={<About />} />
        <Route
          path="*"
          element={
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
              Page not found.
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
