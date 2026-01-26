export interface SearchFormData {
  programType: string;
  targetAge: string;
  location: string;
  duration: string;
}

export interface SummerSchool {
  programName: string;
  institution: string;
  location: string;
  dates: string;
  duration: string;
  targetAge: string;
  programType: string;
  tuitionFees: string;
  applicationDeadline: string;
  officialUrl: string;
  briefDescription: string;
  eligibilityCriteria: string;
  notes: string;
}

export interface AgentStatus {
  id: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  streamingUrl?: string;
  result?: SummerSchool;
  error?: string;
}
