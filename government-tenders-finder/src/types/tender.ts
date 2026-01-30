export type Sector = 
  | 'IT / Software'
  | 'Construction'
  | 'Healthcare'
  | 'Consulting'
  | 'Logistics'
  | 'Education';

export interface Tender {
  id: string;
  tenderTitle: string;
  tenderId: string;
  issuingAuthority: string;
  countryRegion: string;
  tenderType: string;
  publicationDate: string;
  submissionDeadline: string;
  tenderStatus: string;
  officialTenderUrl: string;
  briefDescription: string;
  eligibilityCriteria: string;
  industryCategory: string;
  sourceUrl: string;
}

export interface AgentState {
  id: string;
  url: string;
  name: string;
  status: 'pending' | 'connecting' | 'searching' | 'complete' | 'error';
  message: string;
  streamingUrl?: string;
  tenders: Tender[];
}

export interface TenderSearchState {
  isSearching: boolean;
  selectedSector: Sector | null;
  agents: AgentState[];
  tenders: Tender[];
  selectedTenders: Set<string>;
}
