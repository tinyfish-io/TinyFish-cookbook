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

/** LLM output after Search+Fetch evidence review (see `assessAndSummarizeFromFetchedPages`). */
export interface CompetitorEvidenceAssessment {
  sufficient: boolean;
  confidence: "low" | "medium" | "high";
  reason: string;
  summary_markdown: string;
  structured: {
    key_points: string[];
    comparison_attributes?: Record<string, string | number | boolean | null>;
    extracted_entities?: unknown;
  };
  sources: { url: string; title?: string }[];
}

export type FetchedPageSnippet = {
  url: string;
  title?: string;
  text: string;
};

/** One competitor’s execution path in `/api/research` (hybrid Search+Fetch vs Agent). */
export type ResearchPipelineRun =
  | {
      mode: "search_fetch";
      competitor: Competitor;
      goal: string;
      runId: string;
      competitorIndex: number;
      searchQuery: string;
      pages: FetchedPageSnippet[];
      assessment: CompetitorEvidenceAssessment;
      fetchErrors: { url: string; error: string }[];
    }
  | {
      mode: "agent";
      competitor: Competitor;
      goal: string;
      runId: string;
      competitorIndex: number;
      searchQuery?: string;
      pages?: FetchedPageSnippet[];
      assessment?: CompetitorEvidenceAssessment;
      fetchErrors?: { url: string; error: string }[];
    };
