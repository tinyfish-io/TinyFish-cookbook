// Platform types
export type Platform = 'github' | 'devto' | 'stackoverflow';

// Stack Exchange API item shape
export interface StackExchangeItem {
  question_id: number;
  title: string;
  tags: string[];
  score: number;
  answer_count: number;
  is_answered: boolean;
  link: string;
  body_excerpt?: string;
}

// Search query and result types
export interface SearchQuery {
  platform: Platform;
  query: string;
  filters?: Record<string, string>;
}

export interface SearchResult {
  platform: Platform;
  url: string;
  title: string;
  snippet?: string;
  score?: number;
  answerCount?: number;
  tags?: string[];
  isAnswered?: boolean;
  apiData?: StackExchangeItem;
}

// Agent status types
export type AgentStatus =
  | 'connecting'
  | 'navigating'
  | 'extracting'
  | 'complete'
  | 'error';

export interface AgentStep {
  message: string;
  timestamp: number;
}

// Agent state
export interface ConceptAgentState {
  id: string;
  url: string;
  platform: Platform;
  status: AgentStatus;
  currentStep: string;
  steps: AgentStep[];
  streamingUrl?: string;
  result?: ConceptData;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

// Extracted concept data
export interface ConceptData {
  projectName: string;
  projectUrl: string;
  platform: Platform;
  summary: string;
  techStack: string[];
  alignmentExplanation: string;
  features?: string[];
  stars?: number;
  votes?: number;
  tags?: string[];
  isAccepted?: boolean;
  lastUpdated?: string;
  sourceUrl: string;
}

// App phases
export type AppPhase =
  | 'input'
  | 'generating_queries'
  | 'searching'
  | 'extracting'
  | 'complete';

// Log entry
export interface LogEntry {
  id: string;
  timestamp: number;
  phase: AppPhase;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// Global app state
export interface AppState {
  phase: AppPhase;
  userInput: string | null;
  searchQueries: SearchQuery[];
  searchResults: SearchResult[];
  agents: Record<string, ConceptAgentState>;
  logs: LogEntry[];
  startedAt: number | null;
  completedAt: number | null;
}

// Reducer actions
export type AppAction =
  | { type: 'START_DISCOVERY'; payload: { userInput: string } }
  | { type: 'QUERIES_GENERATED'; payload: { queries: SearchQuery[] } }
  | { type: 'SEARCH_COMPLETE'; payload: { results: SearchResult[] } }
  | {
      type: 'AGENT_CONNECTING';
      payload: { id: string; url: string; platform: Platform };
    }
  | { type: 'AGENT_STEP'; payload: { id: string; step: string } }
  | { type: 'AGENT_STREAMING_URL'; payload: { id: string; streamingUrl: string } }
  | { type: 'AGENT_COMPLETE'; payload: { id: string; result: ConceptData } }
  | { type: 'AGENT_ERROR'; payload: { id: string; error: string } }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'RESET' };

// TinyFish SSE event types
export interface TinyFishSSEEvent {
  type?: string;
  status?: string;
  message?: string;
  purpose?: string;
  action?: string;
  resultJson?: ConceptData;
  streamingUrl?: string;
  step?: number;
  totalSteps?: number;
}

// TinyFish client types
export interface TinyFishCallbacks {
  onStep: (event: TinyFishSSEEvent) => void;
  onStreamingUrl: (url: string) => void;
  onComplete: (result: ConceptData) => void;
  onError: (error: string) => void;
}

export interface TinyFishRequestConfig {
  url: string;
  goal: string;
}
