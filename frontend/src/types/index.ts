// TypeScript mirrors of the FastAPI backend response schemas.
// These are plain data shapes: NO diagnostic math is done in the frontend.
// Every numeric score, band, blind spot and delta below is produced by the
// backend engine and only rendered here.

export type PowerBand = "HIGH" | "MEDIUM" | "LOW";

/** Probability distribution over answer option ids, e.g. { A: 0.82, B: 0.06 }. */
export type Distribution = Record<string, number>;

export interface ResponseOption {
  id: string;
  text: string;
  /** Misconception state id this option is diagnostic of, if any. */
  state?: string | null;
}

export interface AssessmentItem {
  id: string;
  question: string;
  options: ResponseOption[];
  correctOption: string;
  targetStates: string[];
}

export interface Assessment {
  id: string;
  title: string;
  domain: string;
  items: AssessmentItem[];
}

export interface MisconceptionState {
  id: string;
  name: string;
  description: string;
}

export interface MisconceptionResponseMapping {
  itemId: string;
  distributions: Record<string, Distribution>;
}

export interface PairSeparability {
  state_a: string;
  state_b: string;
  separability: number;
}

export interface BlindSpot {
  state_a: string;
  state_b: string;
  separability: number;
  distribution_a: Distribution;
  distribution_b: Distribution;
  explanation: string;
}

export interface DiagnosticAnalysis {
  item_id: string;
  question: string;
  target_states: string[];
  pairwise: PairSeparability[];
  overall_separability: number;
  power_band: PowerBand;
  weakest_pair: PairSeparability;
  blind_spot: BlindSpot | null;
  explanation: string;
}

export interface ObservedDistribution {
  item_id: string;
  total_responses: number;
  counts: Record<string, number>;
  proportions: Record<string, number>;
  label: string;
}

export interface ItemAuditResponse {
  analysis: DiagnosticAnalysis;
  mapping: MisconceptionResponseMapping;
  observed: ObservedDistribution | null;
  item: AssessmentItem;
}

export interface ItemAuditSummary {
  item_id: string;
  question: string;
  overall_separability: number;
  power_band: PowerBand;
  weakest_pair: PairSeparability;
}

export interface AssessmentAudit {
  assessment_id: string;
  title: string;
  domain: string;
  item_count: number;
  items: ItemAuditSummary[];
  band_counts: Record<PowerBand, number>;
  /** Count of items whose overall separability falls in the LOW band. */
  low_power_item_count: number;
}

export interface AssessmentSummary {
  id: string;
  title: string;
  domain: string;
  item_count: number;
  audit_status: string;
  low_power_item_count: number;
  last_analyzed: string;
}

/** Heuristic band cut-offs sourced from the backend config (config.json). */
export interface ThresholdConfig {
  high_threshold: number;
  medium_threshold: number;
  label: string;
}

export interface CandidateScore {
  candidate_id: string;
  question: string;
  intended_purpose: string;
  overall_separability: number;
  power_band: PowerBand;
  target_pair_separability: number;
  improvement: number;
  rank: number;
  is_best_separator: boolean;
}

export interface RepairRecommendation {
  item_id: string;
  current_separability: number;
  current_power_band: PowerBand;
  best_candidate: CandidateScore;
  all_candidates: CandidateScore[];
  rationale: string;
}

export interface ApplyRepairResult {
  assessment_id: string;
  repaired_item_id: string;
  added_item_id: string;
  before_separability: number;
  before_power_band: PowerBand;
  after_separability: number;
  after_power_band: PowerBand;
  delta: number;
  assessment: Assessment;
  message: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}
