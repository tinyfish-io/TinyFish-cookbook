export type LlmoCategory =
  | "Coverage"
  | "Structured Data"
  | "Extractability"
  | "Authority"
  | "Machine Readability";

export type LlmoSeverity = "HIGH" | "MEDIUM" | "LOW";

export type LlmoDimension =
  | "coverageClarity"
  | "structuredData"
  | "extractability"
  | "authority"
  | "machineReadability";

export type LlmoDimensionScore = {
  score: number;
  max: number;
  percent: number;
  failedChecks: string[];
};

export type LlmoBreakdown = {
  coverageClarity: LlmoDimensionScore;
  structuredData: LlmoDimensionScore;
  extractability: LlmoDimensionScore;
  authority: LlmoDimensionScore;
  machineReadability: LlmoDimensionScore;
};

export type LlmoFinding = {
  id: string;
  category: LlmoCategory;
  severity: LlmoSeverity;
  title: string;
  description: string;
  actionItems: string[];
};

export type LlmoScoreResult = {
  overallLlmoScore: number;
  llmoBreakdown: LlmoBreakdown;
  llmoFindings: LlmoFinding[];
};

export type PageLlmoSignals = {
  url: string;
  structuredData: {
    hasJsonLd: boolean;
    types: string[];
    hasOrganization: boolean;
    hasWebSite: boolean;
    hasArticle: boolean;
    hasProduct: boolean;
    hasFaqPage: boolean;
  };
  extractability: {
    hasH1: boolean;
    h1Count: number;
    headingLevels: number[];
    hasSkippedHeadingLevels: boolean;
    paragraphCount: number;
    factStatementCount: number;
  };
  authority: {
    hasAuthor: boolean;
    hasPublishedTime: boolean;
    hasModifiedTime: boolean;
    hasCanonical: boolean;
    hasOrganizationPublisher: boolean;
  };
};

export type MachineReadabilitySignals = {
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  hasLlmsTxt: boolean;
};

export type LlmoSignals = PageLlmoSignals & {
  machineReadability: MachineReadabilitySignals;
};
