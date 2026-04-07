export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  amount: string;
  deadline: string;
  eligibility: string[];
  description: string;
  applicationRequirements: string[];
  additionalInfo: string;
  applicationLink: string;
  region?: string;
  university?: string;
  type: string;
}

export interface SearchParams {
  scholarshipType: string;
  university?: string;
  region?: string;
}

export interface SearchResponse {
  scholarships: Scholarship[];
  searchSummary: string;
}

export interface ScholarshipUrl {
  name: string;
  url: string;
  description: string;
}

export interface AgentStatus {
  agentId: string;
  siteName: string;
  siteUrl?: string;
  description?: string;
  status: "pending" | "running" | "complete" | "error";
  message?: string;
  streamingUrl?: string;
  scholarships?: Scholarship[];
  error?: string;
}

export interface SearchState {
  step: number;
  stepMessage: string;
  urls: ScholarshipUrl[];
  agents: Record<string, AgentStatus>;
  completedScholarships: Scholarship[];
}