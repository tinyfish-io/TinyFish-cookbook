// ─── Detection Categories ─────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export interface Detection {
  name: string;
  version?: string;
  confidence: Confidence;
  evidence: string;
  category: DetectionCategory;
  subcategory?: string;
  url?: string;
}

export type DetectionCategory =
  | 'framework'
  | 'ui-library'
  | 'state-management'
  | 'build-tool'
  | 'analytics'
  | 'monitoring'
  | 'feature-flags'
  | 'auth'
  | 'payment'
  | 'cdn-hosting'
  | 'api-architecture'
  | 'real-time'
  | 'database'
  | 'cms'
  | 'testing'
  | 'security'
  | 'performance'
  | 'third-party';

export const CATEGORY_LABELS: Record<DetectionCategory, string> = {
  'framework': 'Framework',
  'ui-library': 'UI Library',
  'state-management': 'State Management',
  'build-tool': 'Build Tool',
  'analytics': 'Analytics & Tracking',
  'monitoring': 'Monitoring & Observability',
  'feature-flags': 'Feature Flags',
  'auth': 'Authentication',
  'payment': 'Payments',
  'cdn-hosting': 'CDN & Hosting',
  'api-architecture': 'API Architecture',
  'real-time': 'Real-Time',
  'database': 'Database Signals',
  'cms': 'CMS',
  'testing': 'Testing',
  'security': 'Security',
  'performance': 'Performance',
  'third-party': 'Third-Party Services',
};

export const CATEGORY_ICONS: Record<DetectionCategory, string> = {
  'framework': '⚛',
  'ui-library': '🎨',
  'state-management': '🔄',
  'build-tool': '📦',
  'analytics': '📊',
  'monitoring': '🔍',
  'feature-flags': '🚩',
  'auth': '🔐',
  'payment': '💳',
  'cdn-hosting': '☁️',
  'api-architecture': '🔌',
  'real-time': '⚡',
  'database': '🗄',
  'cms': '📝',
  'testing': '🧪',
  'security': '🛡',
  'performance': '🚀',
  'third-party': '🔗',
};

// ─── Network Analysis ─────────────────────────────────────────

export interface ApiEndpoint {
  url: string;
  method?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  type: string;
  status?: number;
  size?: number;
  timing?: number;
}

export interface NetworkAnalysis {
  totalRequests: number;
  totalSize: string;
  apiEndpoints: ApiEndpoint[];
  thirdPartyDomains: string[];
  cdnDomains: string[];
  websocketUrls: string[];
  graphqlEndpoints: string[];
}

// ─── Performance Signals ──────────────────────────────────────

export interface PerformanceSignals {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  totalJsSize: string;
  totalCssSize: string;
  totalRequests: number;
  jsChunkCount: number;
  cssFileCount: number;
  imageCount: number;
  fontCount: number;
  serviceWorker: boolean;
  http2?: boolean;
  preloadHints: string[];
}

// ─── Security Signals ─────────────────────────────────────────

export interface SecuritySignals {
  cspHeader: string | null;
  hstsHeader: boolean;
  xFrameOptions: string | null;
  sourceMapsExposed: boolean;
  exposedKeys: { type: string; partial: string }[];
  cors: string | null;
}

// ─── Infrastructure Profile ───────────────────────────────────

export interface InfraProfile {
  hostingPlatform: Detection | null;
  cdn: Detection | null;
  serverHeader: string | null;
  deploymentSignals: string[];
  edgeLocations: string[];
  tlsVersion: string | null;
}

// ─── Full Scan Result ─────────────────────────────────────────

export interface ScanResult {
  url: string;
  timestamp: string;
  scanDuration: number;
  detections: Detection[];
  networkAnalysis: NetworkAnalysis;
  performanceSignals: PerformanceSignals;
  securitySignals: SecuritySignals;
  infraProfile: InfraProfile;
  techStackSummary: string;
  architectureDiagram: string;
  competitiveInsights: string[];
  /** Phases that failed during extraction; report is partial. */
  failedPhases?: string[];
  /** Human-readable warnings (e.g. partial data). */
  warnings?: string[];
}

// ─── Scan Request / Progress ──────────────────────────────────

export interface ScanRequest {
  url: string;
}

export interface ScanProgress {
  stage: string;
  detail: string;
  progress: number;
}

// ─── TinyFish Web Agent Types ─────────────────────────────────
// Docs: https://docs.mino.ai/key-concepts/endpoints

/** Request body for all TinyFish automation endpoints. */
export interface TinyFishRequest {
  url: string;
  goal: string;
  browser_profile?: 'lite' | 'stealth';
  proxy_config?: { enabled: boolean; country_code?: string };
}

/** Response from POST /v1/automation/run-async (instant submission). */
export interface TinyFishAsyncResponse {
  run_id: string | null;
  error: { code?: string; message?: string } | null;
}

/** Response from GET /v1/runs/{id} (poll for status). */
export interface TinyFishRunStatus {
  run_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  goal?: string;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  result?: Record<string, unknown> | string | null;
  error?: { message?: string } | null;
  streaming_url?: string | null;
}

// Backward-compat aliases (used by extractors and tests)
/** @deprecated Use TinyFishRequest */
export type MinoRequest = TinyFishRequest;
/** @deprecated Use TinyFishRunStatus */
export type MinoResponse = TinyFishRunStatus;
