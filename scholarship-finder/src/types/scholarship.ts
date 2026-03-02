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