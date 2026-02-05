export type SourceType = "docs" | "github" | "stackoverflow" | "blog";

export type ScrapeStatus = "pending" | "scraping" | "complete" | "error";

export type GenerationPhase =
  | "idle"
  | "identifying"
  | "scraping"
  | "synthesizing"
  | "complete"
  | "error";

export interface IdentifiedSource {
  url: string;
  type: SourceType;
  title: string;
  reason: string;
}

export interface ScrapeProgress {
  source: IdentifiedSource;
  status: ScrapeStatus;
  steps: string[];
  content?: string;
  wordCount?: number;
  error?: string;
  streamingUrl?: string;
}

export interface GeneratedSkill {
  id: string;
  topic: string;
  skillMd: string;
  sources: IdentifiedSource[];
  generatedAt: string;
  duration: number;
}

export interface Settings {
  defaultSources: SourceType[];
  browserProfile: "lite" | "stealth";
  enableProxy: boolean;
  proxyCountry: string;
  maxSourcesPerType: number;
  autoSave: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultSources: ["docs", "github", "stackoverflow", "blog"],
  browserProfile: "lite",
  enableProxy: false,
  proxyCountry: "US",
  maxSourcesPerType: 2,
  autoSave: true,
};

// Source type configuration
export const SOURCE_CONFIG: Record<SourceType, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  docs: {
    label: "Documentation",
    icon: "FileText",
    color: "chart-1", // blue
    description: "Official docs and guides",
  },
  github: {
    label: "GitHub",
    icon: "Github",
    color: "chart-2", // purple
    description: "Issues and discussions",
  },
  stackoverflow: {
    label: "Stack Overflow",
    icon: "MessageSquare",
    color: "chart-3", // orange
    description: "Q&A and solutions",
  },
  blog: {
    label: "Dev Blogs",
    icon: "BookOpen",
    color: "chart-4", // green
    description: "Articles and tutorials",
  },
};

// SSE Event types for scraping
export interface SourceStartEvent {
  type: "source_start";
  sourceUrl: string;
  timestamp: number;
}

export interface SourceStepEvent {
  type: "source_step";
  sourceUrl: string;
  detail: string;
  timestamp: number;
}

export interface SourceCompleteEvent {
  type: "source_complete";
  sourceUrl: string;
  content: string;
  wordCount: number;
  timestamp: number;
}

export interface SourceErrorEvent {
  type: "source_error";
  sourceUrl: string;
  error: string;
  timestamp: number;
}

export interface ScrapeCompleteEvent {
  type: "scrape_complete";
  results: ScrapeProgress[];
}

export type ScrapeEvent =
  | SourceStartEvent
  | SourceStepEvent
  | SourceCompleteEvent
  | SourceErrorEvent
  | ScrapeCompleteEvent;

// localStorage keys
export const STORAGE_KEYS = {
  SKILLS: "skillforge_skills",
  HISTORY: "skillforge_history",
  SETTINGS: "skillforge_settings",
} as const;
