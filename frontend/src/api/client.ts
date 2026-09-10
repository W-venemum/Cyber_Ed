// Thin, typed fetch wrapper around the FastAPI Assessment Auditor backend.
// The frontend NEVER computes diagnostic scores; it only calls these
// endpoints and renders whatever the deterministic engine returns.

import type {
  ApplyRepairResult,
  Assessment,
  AssessmentAudit,
  AssessmentSummary,
  HealthResponse,
  ItemAuditResponse,
  MisconceptionResponseMapping,
  MisconceptionState,
  RepairRecommendation,
  ThresholdConfig,
} from "../types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      headers: { Accept: "application/json" },
      ...init,
    });
  } catch (err) {
    throw new ApiError(
      0,
      `Could not reach the backend at ${API_BASE_URL}. Is the FastAPI server running? (${
        (err as Error).message
      })`,
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const getHealth = () => request<HealthResponse>("/health");

export const getThresholds = () =>
  request<ThresholdConfig>("/config/thresholds");

export const getStates = () => request<MisconceptionState[]>("/states");

export const getItemMappings = (itemId: string) =>
  request<MisconceptionResponseMapping>(
    `/items/${encodeURIComponent(itemId)}/mappings`,
  );

export const getAssessments = () =>
  request<AssessmentSummary[]>("/assessments");

export const getAssessment = (assessmentId: string) =>
  request<Assessment>(`/assessments/${encodeURIComponent(assessmentId)}`);

export const getAssessmentAudit = (assessmentId: string) =>
  request<AssessmentAudit>(
    `/assessments/${encodeURIComponent(assessmentId)}/audit`,
  );

export const getItemAudit = (itemId: string) =>
  request<ItemAuditResponse>(`/items/${encodeURIComponent(itemId)}/audit`);

export const getItemCandidates = (itemId: string) =>
  request<RepairRecommendation>(
    `/items/${encodeURIComponent(itemId)}/candidates`,
  );

export const applyRepair = (itemId: string, candidateId?: string) => {
  const query = candidateId
    ? `?candidate_id=${encodeURIComponent(candidateId)}`
    : "";
  return request<ApplyRepairResult>(
    `/items/${encodeURIComponent(itemId)}/apply-repair${query}`,
    { method: "POST" },
  );
};

export const resetStore = () =>
  request<{ status: string; assessment_id: string; item_count: number }>(
    "/reset",
    { method: "POST" },
  );
