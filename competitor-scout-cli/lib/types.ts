export interface Competitor {
  id: string;
  name: string;
  url: string;
}

export interface ResearchEvent {
  type:
    | "planning"
    | "goals"
    | "submitting"
    | "polling"
    | "result"
    | "summarizing"
    | "summary"
    | "error"
    | "done";
  competitor?: string;
  message: string;
  data?: unknown;
}

export interface ResearchGoal {
  competitor_name: string;
  competitor_url: string;
  goal: string;
}

export interface TinyfishRunResult {
  run_id: string;
  status: string;
  result?: unknown;
  error?: string;
}

export interface CompetitorResult {
  competitor: Competitor;
  goal: string;
  runId: string;
  status: string;
  rawResult: unknown;
  aiSummary?: string;
}
