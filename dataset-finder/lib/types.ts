export interface Dataset {
  name: string;
  source_url: string;
  description: string;
  platform: string;
}

export type DataType = 'Tabular' | 'Images' | 'Text' | 'Audio' | 'Video' | 'Mixed';

export interface DatasetCard {
  name: string;
  description: string;
  best_for: string[];
  data_type: DataType | string;
  source: string;
  access: string;
  what_you_get: {
    columns?: string;
    coverage?: string;
    frequency?: string;
    size?: string;
  };
  notes: string[];
  direct_link: string;
  status: 'Accessible' | 'Partial' | 'Blocked';
  usability_risk: 'Low' | 'Medium' | 'High' | 'Cannot Assess';
}

export interface AgentState {
  id: string;
  dataset: Dataset;
  status: 'pending' | 'connecting' | 'browsing' | 'analyzing' | 'complete' | 'blocked' | 'not_found' | 'error';
  statusMessage: string;
  currentStep: string | null;
  streaming_url: string | null;
  card: DatasetCard | null;
  error: string | null;
}

export type UseCase = 'machine-learning' | 'academic-research' | 'visualization' | 'general';
