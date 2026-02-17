export type LoanType = 'personal' | 'home' | 'education' | 'business';

export interface LoanTypeOption {
  id: LoanType;
  label: string;
  icon: string;
  description: string;
}

export interface BankLoanInfo {
  id: string;
  bankName: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  statusMessage?: string;
  streamingUrl?: string;
  result?: LoanAnalysisResult;
}

export interface LoanAnalysisResult {
  bankName: string;
  interestRateRange?: string;
  tenure?: string;
  eligibility?: string[];
  fees?: string[];
  benefits?: string[];
  drawbacks?: string[];
  clarity?: string;
  description: string;
  score: number;
}

export interface SearchState {
  isSearching: boolean;
  isDiscovering: boolean;
  banks: BankLoanInfo[];
  error?: string;
}
