import type {
  LlmoBreakdown,
  LlmoDimensionScore,
  LlmoFinding,
  LlmoScoreResult,
  LlmoSignals,
} from "@/lib/llmo-types";

type LlmoScoringInput = {
  coverageScore: number;
  signals: LlmoSignals;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calcDimension(score: number, max: number, failedChecks: string[]): LlmoDimensionScore {
  const safe = clamp(score, 0, max);
  return {
    score: safe,
    max,
    percent: max === 0 ? 0 : Math.round((safe / max) * 100),
    failedChecks,
  };
}

function finding(
  category: LlmoFinding["category"],
  severity: LlmoFinding["severity"],
  title: string,
  description: string,
  actionItems: string[]
): LlmoFinding {
  return {
    id: `${category.toLowerCase().replace(/\s+/g, "-")}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`,
    category,
    severity,
    title,
    description,
    actionItems,
  };
}

export function computeLlmoScore({ coverageScore, signals }: LlmoScoringInput): LlmoScoreResult {
  // Dimension maxima sum to 100 for direct weighting.
  const maxCoverage = 40;
  const maxStructured = 25;
  const maxExtractability = 15;
  const maxAuthority = 10;
  const maxMachineReadability = 10;

  const findings: LlmoFinding[] = [];

  const coverage = Math.round((clamp(coverageScore, 0, 100) / 100) * maxCoverage);
  const coverageFailed = coverage < 20 ? ["Coverage score is below 50%."] : [];

  let structured = 0;
  const structuredFailed: string[] = [];
  if (signals.structuredData.hasJsonLd) structured += 8;
  else structuredFailed.push("No JSON-LD script blocks detected.");
  if (signals.structuredData.hasOrganization || signals.structuredData.hasWebSite) structured += 7;
  else structuredFailed.push("Missing Organization or WebSite schema.");
  if (
    signals.structuredData.hasArticle ||
    signals.structuredData.hasProduct ||
    signals.structuredData.hasFaqPage
  ) {
    structured += 6;
  } else {
    structuredFailed.push("Missing content-specific schema (Article/Product/FAQPage).");
  }
  if (signals.structuredData.types.length >= 2) structured += 4;

  let extractability = 0;
  const extractabilityFailed: string[] = [];
  if (signals.extractability.hasH1) extractability += 4;
  else extractabilityFailed.push("No H1 heading detected.");
  if (!signals.extractability.hasSkippedHeadingLevels) extractability += 4;
  else extractabilityFailed.push("Heading hierarchy has skipped levels.");
  if (signals.extractability.paragraphCount >= 4) extractability += 3;
  else extractabilityFailed.push("Very little paragraph content detected.");
  if (signals.extractability.factStatementCount >= 3) extractability += 4;
  else extractabilityFailed.push("Few explicit factual statements detected.");

  let authority = 0;
  const authorityFailed: string[] = [];
  if (signals.authority.hasAuthor) authority += 2;
  else authorityFailed.push("No author metadata found.");
  if (signals.authority.hasPublishedTime) authority += 2;
  else authorityFailed.push("No published date metadata found.");
  if (signals.authority.hasModifiedTime) authority += 2;
  else authorityFailed.push("No modified date metadata found.");
  if (signals.authority.hasCanonical) authority += 2;
  else authorityFailed.push("No canonical URL found.");
  if (signals.authority.hasOrganizationPublisher) authority += 2;
  else authorityFailed.push("No organization publisher signal found.");

  let machineReadability = 0;
  const machineFailed: string[] = [];
  if (signals.machineReadability.hasRobotsTxt) machineReadability += 3;
  else machineFailed.push("robots.txt not found.");
  if (signals.machineReadability.hasSitemapXml) machineReadability += 4;
  else machineFailed.push("sitemap.xml not found.");
  if (signals.machineReadability.hasLlmsTxt) machineReadability += 3;
  else machineFailed.push("llms.txt not found.");

  if (structured < 13) {
    findings.push(
      finding(
        "Structured Data",
        "HIGH",
        "Add machine-readable schema markup",
        "Your pages are missing key JSON-LD signals that help AI systems understand and cite content.",
        [
          "Add JSON-LD scripts with schema.org vocabulary.",
          "Include Organization or WebSite schema at site level.",
          "Add Article, Product, or FAQPage schema for primary content types.",
        ]
      )
    );
  }

  if (extractability < 8) {
    findings.push(
      finding(
        "Extractability",
        "MEDIUM",
        "Improve content structure for extraction",
        "AI systems may struggle to reliably extract facts due to weak heading structure or sparse factual statements.",
        [
          "Use a consistent H1/H2/H3 hierarchy without skipped levels.",
          "Add clear factual sentences for product, pricing, and capabilities.",
          "Break long content into short, well-labeled sections.",
        ]
      )
    );
  }

  if (authority < 5) {
    findings.push(
      finding(
        "Authority",
        "MEDIUM",
        "Strengthen trust and attribution signals",
        "Authority metadata is limited, which can reduce confidence in AI-generated citations.",
        [
          "Add author and publisher metadata.",
          "Include published and last-modified timestamps.",
          "Ensure canonical URLs are set for primary pages.",
        ]
      )
    );
  }

  if (machineReadability < 6) {
    findings.push(
      finding(
        "Machine Readability",
        "HIGH",
        "Add AI-facing crawl and discovery files",
        "Machine-readable access files are missing, making discovery and retrieval less reliable for AI systems.",
        [
          "Ensure robots.txt is available and valid.",
          "Expose sitemap.xml and reference it in robots.txt.",
          "Publish an llms.txt file with key docs and product facts.",
        ]
      )
    );
  }

  const llmoBreakdown: LlmoBreakdown = {
    coverageClarity: calcDimension(coverage, maxCoverage, coverageFailed),
    structuredData: calcDimension(structured, maxStructured, structuredFailed),
    extractability: calcDimension(extractability, maxExtractability, extractabilityFailed),
    authority: calcDimension(authority, maxAuthority, authorityFailed),
    machineReadability: calcDimension(machineReadability, maxMachineReadability, machineFailed),
  };

  const overallLlmoScore = clamp(
    llmoBreakdown.coverageClarity.score +
      llmoBreakdown.structuredData.score +
      llmoBreakdown.extractability.score +
      llmoBreakdown.authority.score +
      llmoBreakdown.machineReadability.score,
    0,
    100
  );

  return {
    overallLlmoScore,
    llmoBreakdown,
    llmoFindings: findings.slice(0, 5),
  };
}
