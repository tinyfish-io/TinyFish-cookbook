const body = document.body;
const promptComposer = document.getElementById("prompt-composer");
const form = document.getElementById("investigation-form");
const sourceUrlsInput = document.getElementById("source-urls");
const comparisonSitesInput = document.getElementById("comparison-sites");
const resultsNode = document.getElementById("results");
const pastRunsNode = document.getElementById("past-runs");
const pastCasesNode = document.getElementById("past-cases");
const historyDropdown = document.getElementById("history-dropdown");
const historyButton = document.getElementById("history-button");
const caseHistoryDropdown = document.getElementById("case-history-dropdown");
const caseHistoryButton = document.getElementById("case-history-button");
const statusPill = document.getElementById("status-pill");
const progressText = document.getElementById("progress-text");
const progressOverview = document.getElementById("progress-overview");
const progressTrack = document.getElementById("progress-track");
const progressFill = document.getElementById("progress-fill");
const configNote = document.getElementById("config-note");
const reportTemplate = document.getElementById("report-template");
const matchTemplate = document.getElementById("match-template");
const runButton = document.getElementById("run-button");
const timelineSourceUrl = document.getElementById("timeline-source-url");
const timelineSourceLink = document.getElementById("timeline-source-link");
const timelineSourceFrame = document.getElementById("timeline-source-frame");
const timelineSourceMeta = document.getElementById("timeline-source-meta");
const timelineSearchLog = document.getElementById("timeline-search-log");
const timelineCandidateStream = document.getElementById("timeline-candidate-stream");
const timelineSignalGraph = document.getElementById("timeline-signal-graph");
const timelineAnalysisLog = document.getElementById("timeline-analysis-log");
const timelineRankingList = document.getElementById("timeline-ranking-list");
const generateReportButton = document.getElementById("generate-report-button");
const reportPdfFrame = document.getElementById("report-pdf-frame");
const reportMeta = document.getElementById("report-meta");
const reportNote = document.getElementById("report-note");
const reportBackButton = document.getElementById("report-back-button");
const reportOpenButton = document.getElementById("report-open-button");
const newInvestigationButton = document.getElementById("new-investigation-button");
const caseTitle = document.getElementById("case-title");
const caseSubtitle = document.getElementById("case-subtitle");
const caseStatusPill = document.getElementById("case-status-pill");
const caseProgressText = document.getElementById("case-progress-text");
const caseProgressTrack = document.getElementById("case-progress-track");
const caseProgressFill = document.getElementById("case-progress-fill");
const caseProfileSummary = document.getElementById("case-profile-summary");
const caseSeedSummary = document.getElementById("case-seed-summary");
const caseSuspectListings = document.getElementById("case-suspect-listings");
const caseEvidenceGrid = document.getElementById("case-evidence-grid");
const caseDraft = document.getElementById("case-draft");
const caseActivityLog = document.getElementById("case-activity-log");
const caseAgentLog = document.getElementById("case-agent-log");
const caseBackButton = document.getElementById("case-back-button");
const caseGenerateReportButton = document.getElementById("case-generate-report-button");
const timelineTrack = document.getElementById("progress-list");
const timelineNotes = {
  source: document.getElementById("timeline-source-note"),
  search: document.getElementById("timeline-search-note"),
  candidates: document.getElementById("timeline-candidates-note"),
  analysis: document.getElementById("timeline-analysis-note"),
  ranking: document.getElementById("timeline-ranking-note"),
};

let pollTimer = null;
let currentInvestigationId = null;
let pastRunsCache = [];
let pastCasesCache = [];
let currentPhase = body.dataset.phase || "prompt";
let lastSubmittedSourceUrl = "";
let activeTimelineStage = "source";
let latestInvestigationPayload = null;
let appConfig = null;
let currentReportPdfUrl = null;
let reportGenerationInFlight = false;
let caseReportGenerationInFlight = false;
let casePollTimer = null;
let currentCaseId = null;
let latestCasePayload = null;
let previousPhaseBeforeCase = "progress";
let previousPhaseBeforeReport = "progress";

const defaultRunButtonLabel = runButton.textContent;
const defaultGenerateReportButtonLabel = generateReportButton?.textContent || "Generate report";
const defaultCaseGenerateReportButtonLabel =
  caseGenerateReportButton?.textContent || "Generate report";
const persistedInvestigationStorageKey = "tinydetective:last-investigation-id";
const persistedCaseStorageKey = "tinydetective:last-case-id";
const progressStepDefinitions = [
  { key: "source_extraction", label: "Extract official product details" },
  { key: "candidate_discovery", label: "Search configured marketplaces" },
  { key: "candidate_triage", label: "Triage candidate pool with OpenAI" },
  { key: "product_comparison", label: "Compare candidate listings" },
  { key: "evidence", label: "Assemble supporting evidence" },
  { key: "reasoning_enrichment", label: "Refine reasoning with OpenAI" },
  { key: "ranking", label: "Rank suspicious matches" },
  { key: "research_summary", label: "Summarize the investigation" },
];
const progressStepIndex = Object.fromEntries(
  progressStepDefinitions.map((step, index) => [step.key, index])
);
const timelineStageDefinitions = [
  { key: "source", label: "Source Page" },
  { key: "search", label: "Live Search Behavior" },
  { key: "candidates", label: "Candidate Intake" },
  { key: "analysis", label: "Reasoning Graph" },
  { key: "ranking", label: "Ranking Ladder" },
];
const timelineStageItems = Object.fromEntries(
  timelineStageDefinitions.map((stage) => [
    stage.key,
    document.querySelector(`[data-timeline-step="${stage.key}"]`),
  ])
);
const timelineRailItems = Object.fromEntries(
  timelineStageDefinitions.map((stage) => [
    stage.key,
    document.querySelector(`[data-timeline-rail="${stage.key}"]`),
  ])
);
const statusLabels = {
  idle: "Idle",
  queued: "Queued",
  running: "Running",
  delayed: "Delayed",
  completed: "Completed",
  failed: "Failed",
  reviewed: "Reviewed",
  exported: "Exported",
};
const progressStateLabels = {
  pending: "Pending",
  queued: "Queued",
  running: "In Progress",
  delayed: "Delayed",
  completed: "Done",
  failed: "Failed",
};
const timelineStateLabels = {
  pending: "Pending",
  queued: "Queued",
  running: "Live",
  delayed: "Delayed",
  completed: "Ready",
  failed: "Failed",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] || character;
  });
}

function formatHostname(value) {
  if (!value) {
    return "Unknown source";
  }

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return String(value);
  }
}

function formatCompactCurrency(value, currency) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Price unavailable";
  }

  try {
    return new Intl.NumberFormat([], {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${currency || ""} ${value}`.trim();
  }
}

function formatElapsedSeconds(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  const seconds = Math.max(1, Math.round(Number(value)));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }
  return `${Math.round(seconds / 3600)}h`;
}

function normalizeScore(value) {
  const numericValue = Number(value) || 0;
  if (numericValue > 1) {
    return Math.max(0, Math.min(numericValue / 10, 1));
  }
  return Math.max(0, Math.min(numericValue, 1));
}

function getRiskColor(value) {
  const normalizedValue = normalizeScore(value);
  if (normalizedValue >= 0.75) {
    return "hsl(7 72% 46%)";
  }
  if (normalizedValue >= 0.45) {
    return "hsl(35 82% 46%)";
  }
  return "hsl(145 58% 38%)";
}

function humanizeFieldName(value, { capitalize = true } = {}) {
  const normalized = String(value || "field")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "field";
  }

  if (!capitalize) {
    return normalized.toLowerCase();
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatReasonText(value) {
  return String(value || "")
    .replace(/\b[a-z0-9]+(?:[_-]+[a-z0-9]+)+\b/gi, (token) =>
      humanizeFieldName(token, { capitalize: false })
    )
    .replace(/\s+/g, " ")
    .trim();
}

function humanizeSignal(signal) {
  const signalMap = {
    suspiciously_low_price: "The listing is priced materially below the official source price.",
    brand_mismatch: "The brand information does not align with the official product.",
    copied_description_with_discount_pricing:
      "The listing appears to reuse official product copy while also discounting heavily.",
  };

  return signalMap[signal] || humanizeFieldName(signal);
}

function formatNaturalList(items) {
  const values = [...new Set((items || []).filter(Boolean))];
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function getRiskReasonLines(match) {
  const lines = [];
  const evidence = match.evidence || [];
  const priceEvidence = evidence.find((item) => item.field === "price");
  const descriptionEvidence = evidence.find((item) => item.field === "description");

  (match.suspicious_signals || []).forEach((signal) => {
    lines.push(humanizeSignal(signal));
  });

  if (priceEvidence && !lines.some((line) => line.toLowerCase().includes("priced materially below"))) {
    lines.push(priceEvidence.note);
  }

  if (
    descriptionEvidence &&
    !lines.some((line) => line.toLowerCase().includes("reuse official product copy"))
  ) {
    lines.push(descriptionEvidence.note);
  }

  if (lines.length === 0) {
    if (normalizeScore(match.counterfeit_risk_score) < 0.35) {
      lines.push("Few direct counterfeit indicators were detected in the captured evidence.");
    } else {
      lines.push(
        formatReasonText(match.reason || "The backend did not return a more specific counterfeit-risk rationale.")
      );
    }
  }

  return [...new Set(lines)];
}

function getMatchReasonLines(match) {
  const evidence = match.evidence || [];
  const matchedFields = evidence
    .filter((item) => /matches between source and candidate/i.test(item.note))
    .map((item) => humanizeFieldName(item.field));
  const mismatchedFields = evidence
    .filter((item) => /does not match between source and candidate/i.test(item.note))
    .map((item) => humanizeFieldName(item.field));
  const lines = [];

  if (matchedFields.length > 0) {
    lines.push(`Aligned fields: ${formatNaturalList(matchedFields)}.`);
  }

  if (mismatchedFields.length > 0) {
    lines.push(`Mismatched fields: ${formatNaturalList(mismatchedFields)}.`);
  }

  if (normalizeScore(match.match_score) < 0.5) {
    if (matchedFields.length <= 1) {
      lines.push("Too few structured attributes aligned strongly with the official product.");
    }
    if (mismatchedFields.length === 0 && matchedFields.length === 0) {
      lines.push("The backend found only weak directional similarity rather than a strong structured match.");
    }
  } else if (normalizeScore(match.match_score) >= 0.75 && matchedFields.length > 0) {
    lines.push("Multiple structured attributes line up with the official product, which keeps the match score elevated.");
  }

  if (lines.length === 0) {
    lines.push(formatReasonText(match.reason || "The backend did not return a more specific match rationale."));
  }

  return [...new Set(lines)];
}

function sanitizePlainText(value) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .trim();
}

function formatReportDate(value) {
  if (!value) {
    return "Unavailable";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unavailable";
  }

  return timestamp.toLocaleString();
}

function getBrandWebsite(payload) {
  return (
    appConfig?.brand_landing_page_url ||
    payload?.reports?.[0]?.source_url ||
    lastSubmittedSourceUrl ||
    "Unavailable"
  );
}

function getSuggestedActionsForReport(report) {
  const rankedListings = getRankingSnapshots(report);
  const highRiskListings = rankedListings.filter((item) => normalizeScore(item.counterfeit_risk_score) >= 0.75);
  const mediumRiskListings = rankedListings.filter((item) => {
    const score = normalizeScore(item.counterfeit_risk_score);
    return score >= 0.45 && score < 0.75;
  });
  const officialLikeListings = collectCompletedComparisons(report).filter(
    (item) => item.official_store_signals && item.official_store_signals.length > 0
  );

  if (highRiskListings.length > 0) {
    return [
      `Preserve evidence for the ${highRiskListings.length} highest-risk listing${highRiskListings.length === 1 ? "" : "s"} and capture screenshots before they change.`,
      "Escalate the top suspicious URLs to marketplace trust and safety or brand protection workflows for takedown review.",
      "Cross-check seller identity, price, and product attributes against authorized channels before enforcement.",
    ];
  }

  if (mediumRiskListings.length > 0) {
    return [
      "Queue the medium-risk listings for manual analyst review before any takedown request is sent.",
      "Compare seller metadata, pricing, and evidence notes against the official product page to confirm whether escalation is warranted.",
      "Continue monitoring search coverage in case stronger lookalikes appear in subsequent crawls.",
    ];
  }

  if (officialLikeListings.length > 0) {
    return [
      "Do not treat official-store-like listings as counterfeit without manual confirmation.",
      "Review the official-store signals first and separate those listings from enforcement queues.",
    ];
  }

  return [
    "No high-confidence counterfeit target was found in the ranked set; keep monitoring and rerun the investigation if new listings appear.",
    "Archive the collected evidence and search coverage as a baseline for future comparisons.",
  ];
}

function buildOperationalTrace(task) {
  const output = task.output_payload || {};
  const traceDetails = [];

  if (task.agent_name === "candidate_discovery") {
    traceDetails.push(
      `site: ${sanitizePlainText(
        output.comparison_site || task.input_payload?.comparison_site || "Unavailable"
      )}`
    );
    traceDetails.push(
      `query: ${sanitizePlainText(output.search_query || task.input_payload?.search_query || "Unavailable")}`
    );
    if (output.candidate_count !== undefined) {
      traceDetails.push(`candidate count: ${sanitizePlainText(output.candidate_count)}`);
    }
  }

  if (task.agent_name === "product_comparison" && output.comparison?.product_url) {
    traceDetails.push(`product: ${sanitizePlainText(output.comparison.product_url)}`);
  }

  if (task.agent_name === "ranking" && output.ranked_product_urls?.length) {
    traceDetails.push(`ranked URLs: ${sanitizePlainText(output.ranked_product_urls.length)}`);
  }

  if (task.error) {
    traceDetails.push(`error: ${sanitizePlainText(task.error)}`);
  }

  const providerState = describeProviderState(task);
  if (providerState) {
    traceDetails.push(`provider: ${sanitizePlainText(providerState)}`);
  }

  return traceDetails;
}

function getReportLimitations(report) {
  const gaps = [
    "This dossier captures observed URLs, extracted listing data, and heuristic comparison evidence only. It does not itself prove infringement or counterfeit authenticity as a legal conclusion.",
    "Trademark registrations, chain-of-title documents, prior enforcement history, and counsel-reviewed legal claims should be attached separately before filing a complaint or lawsuit.",
    "Screenshots, page captures, and test-buy evidence were not automatically preserved in this run and should be captured separately if platform reporting or litigation support requires them.",
  ];

  const missingSellerCount = getRankingSnapshots(report)
    .slice(0, 5)
    .filter((item) => !item.candidate_product?.seller_name).length;

  if (missingSellerCount > 0) {
    gaps.push(
      `${missingSellerCount} ranked listing${missingSellerCount === 1 ? "" : "s"} did not include seller identity in the captured data and may need manual follow-up.`
    );
  }

  return gaps;
}

function buildInvestigationPdf(payload) {
  const jsPdfApi = window.jspdf?.jsPDF;
  if (!jsPdfApi) {
    throw new Error("The PDF renderer is not available in this browser session.");
  }

  const doc = new jsPdfApi({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const ensureSpace = (height = 18) => {
    if (cursorY + height <= pageHeight - margin) {
      return;
    }
    doc.addPage();
    cursorY = margin;
  };

  const drawRule = () => {
    ensureSpace(16);
    doc.setDrawColor(204, 198, 188);
    doc.setLineWidth(0.7);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 16;
  };

  const addKicker = (text) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(132, 124, 113);
    doc.text(sanitizePlainText(String(text || "").toUpperCase()), margin, cursorY);
    cursorY += 14;
  };

  const addHeading = (text, size = 18) => {
    const lines = doc.splitTextToSize(sanitizePlainText(text), contentWidth);
    ensureSpace(lines.length * (size + 4));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(54, 46, 39);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * (size + 4);
  };

  const addParagraph = (text, options = {}) => {
    const fontSize = options.fontSize || 11;
    const lineHeight = options.lineHeight || 16;
    const lines = doc.splitTextToSize(sanitizePlainText(text), contentWidth);
    ensureSpace(lines.length * lineHeight + 6);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(options.muted ? 110 : 70, options.muted ? 103 : 62, options.muted ? 95 : 54);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * lineHeight + 6;
  };

  const addBulletList = (items, options = {}) => {
    const values = (items || []).map((item) => sanitizePlainText(item)).filter(Boolean);
    if (values.length === 0) {
      return;
    }

    const fontSize = options.fontSize || 11;
    const lineHeight = options.lineHeight || 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(70, 62, 54);

    values.forEach((item) => {
      const bulletX = margin + 4;
      const textX = margin + 14;
      const lines = doc.splitTextToSize(item, contentWidth - 18);
      ensureSpace(lines.length * lineHeight + 4);
      doc.text("-", bulletX, cursorY);
      doc.text(lines, textX, cursorY);
      cursorY += lines.length * lineHeight + 4;
    });

    cursorY += 2;
  };

  const addDefinitionList = (rows) => {
    const filteredRows = (rows || []).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (filteredRows.length === 0) {
      return;
    }

    filteredRows.forEach(([label, value]) => {
      const line = `${sanitizePlainText(label)}: ${sanitizePlainText(value)}`;
      addParagraph(line, { fontSize: 10.5, lineHeight: 15 });
    });
  };

  const addSection = (kicker, heading, body) => {
    if (cursorY > margin + 8) {
      drawRule();
    }
    addKicker(kicker);
    addHeading(heading, 16);
    body();
  };

  const reports = payload?.reports || [];
  const brandWebsite = getBrandWebsite(payload);

  addKicker("TinyDetective");
  addHeading("Counterfeit Research Evidence Dossier", 22);
  addParagraph(
    "Prepared from the captured TinyDetective investigation outputs for internal review, marketplace complaint preparation, and counsel handoff. This report is an evidence summary, not legal advice.",
    { fontSize: 11.5, lineHeight: 17 }
  );
  addDefinitionList([
    ["Investigation ID", payload?.investigation_id || "Unavailable"],
    ["Status", payload?.status || "Unavailable"],
    ["Created", formatReportDate(payload?.created_at)],
    ["Updated", formatReportDate(payload?.updated_at)],
    ["Brand website", brandWebsite],
  ]);

  reports.forEach((report, index) => {
    const sourceProduct = report.extracted_source_product || {};
    const candidateTasks = getCandidateTasks(report);
    const discoveredCandidates = collectDiscoveredCandidates(report);
    const completedComparisons = collectCompletedComparisons(report);
    const rankedListings = getRankingSnapshots(report);
    const suggestedActions = getSuggestedActionsForReport(report);
    const suspiciousUrls = rankedListings.map((item) => String(item.product_url));
    const operationalTrace = (report.raw_agent_outputs || []).map((task) => {
      const details = [
        task.agent_name || "agent",
        task.status || "unknown",
        ...buildOperationalTrace(task),
      ];
      return details.join(" | ");
    });

    addSection(`Source ${index + 1}`, "Investigation Scope", () => {
      addDefinitionList([
        ["Input URL", report.source_url || lastSubmittedSourceUrl],
        ["Brand website", brandWebsite],
        ["Report summary", report.summary || "No summary returned."],
        ["Report error", report.error || ""],
        ["Official-store exclusions", report.excluded_official_store_count ?? 0],
      ]);
    });

    addSection(`Source ${index + 1}`, "Official Product Reference", () => {
      addDefinitionList([
        ["Brand", sourceProduct.brand || "Unavailable"],
        ["Product name", sourceProduct.product_name || "Unavailable"],
        ["Category", sourceProduct.category || "Unavailable"],
        ["Subcategory", sourceProduct.subcategory || "Unavailable"],
        ["SKU", sourceProduct.sku || "Unavailable"],
        ["Model", sourceProduct.model || "Unavailable"],
        ["Price", sourceProduct.price !== null && sourceProduct.price !== undefined
          ? formatCompactCurrency(sourceProduct.price, sourceProduct.currency)
          : "Unavailable"],
        ["Color", sourceProduct.color || "Unavailable"],
        ["Size", sourceProduct.size || "Unavailable"],
        ["Material", sourceProduct.material || "Unavailable"],
        ["Features", (sourceProduct.features || []).join(", ") || "Unavailable"],
      ]);
    });

    addSection(`Source ${index + 1}`, "Ranked Listings of Concern", () => {
      if (rankedListings.length === 0) {
        addParagraph("No ranked suspicious or lookalike listings were available in this run.", {
          muted: true,
        });
        return;
      }

      rankedListings.slice(0, 5).forEach((match, rankIndex) => {
        addParagraph(
          `#${rankIndex + 1} ${match.candidate_product?.title || match.candidate_product?.model || match.product_url}`,
          { bold: true, fontSize: 12, lineHeight: 17 }
        );
        addDefinitionList([
          ["Listing URL", match.product_url],
          ["Marketplace", match.marketplace || formatHostname(match.product_url)],
          ["Seller", match.candidate_product?.seller_name || "Unavailable"],
          ["Risk score", Number(match.counterfeit_risk_score || 0).toFixed(2)],
          ["Match score", Number(match.match_score || 0).toFixed(2)],
        ]);
        addParagraph(`Observed rationale: ${match.reason || "No reason returned."}`, {
          fontSize: 10.5,
          lineHeight: 15,
        });
        addBulletList(
          getRiskReasonLines(match).map((line) => `Risk reasoning: ${line}`)
        );
        addBulletList(
          getMatchReasonLines(match).map((line) => `Match reasoning: ${line}`)
        );
        addBulletList(
          (match.evidence || []).slice(0, 5).map((item) => {
            const sourceValue =
              item.source_value !== null && item.source_value !== undefined ? ` | source: ${item.source_value}` : "";
            const candidateValue =
              item.candidate_value !== null && item.candidate_value !== undefined
                ? ` | candidate: ${item.candidate_value}`
                : "";
            return `Evidence - ${humanizeFieldName(item.field)}: ${item.note}${sourceValue}${candidateValue}`;
          }),
          { fontSize: 10, lineHeight: 14 }
        );
        cursorY += 4;
      });
    });

    addSection(`Source ${index + 1}`, "Suspicious URLs", () => {
      addBulletList(
        suspiciousUrls.length > 0 ? suspiciousUrls : ["No suspicious URLs were ranked in this run."]
      );
    });

    addSection(`Source ${index + 1}`, "Marketplace Search Coverage", () => {
      if (candidateTasks.length === 0) {
        addParagraph("No marketplace search tasks were recorded.", { muted: true });
        return;
      }

      addBulletList(
        candidateTasks.map((task) => {
          const query = task.output_payload?.search_query || task.input_payload?.search_query || "Unavailable";
          const site = task.output_payload?.comparison_site || task.input_payload?.comparison_site || "Unavailable";
          const candidateCount = task.output_payload?.candidate_count;
          return `${formatHostname(site)} | query: ${query} | status: ${task.status || "unknown"}${
            candidateCount !== undefined ? ` | candidates: ${candidateCount}` : ""
          }`;
        })
      );
    });

    addSection(`Source ${index + 1}`, "Discovered Listing Inventory", () => {
      if (discoveredCandidates.length === 0) {
        addParagraph("No candidate listings were captured.", { muted: true });
        return;
      }

      addBulletList(
        discoveredCandidates.map((candidate) => {
          const title = candidate.title || candidate.model || candidate.product_url;
          const price =
            candidate.price !== null && candidate.price !== undefined
              ? formatCompactCurrency(candidate.price, candidate.currency)
              : "Price unavailable";
          return `${title} | ${candidate.product_url} | marketplace: ${
            candidate.marketplace || formatHostname(candidate.product_url)
          } | seller: ${candidate.seller_name || "Unavailable"} | price: ${price} | query: ${
            candidate.discovery_query || "Unavailable"
          }`;
        })
      );
    });

    addSection(`Source ${index + 1}`, "Comparison Evidence Inventory", () => {
      if (completedComparisons.length === 0) {
        addParagraph("No completed comparison records were available.", { muted: true });
        return;
      }

      addBulletList(
        completedComparisons.map((comparison) => {
          const signals = (comparison.suspicious_signals || []).join(", ") || "None";
          return `${
            comparison.candidate_product?.title || comparison.candidate_product?.model || comparison.product_url
          } | ${comparison.product_url} | risk ${Number(comparison.counterfeit_risk_score || 0).toFixed(2)} | match ${Number(
            comparison.match_score || 0
          ).toFixed(2)} | signals: ${signals}`;
        })
      );
    });

    addSection(`Source ${index + 1}`, "Recommended Next Actions", () => {
      addBulletList(suggestedActions);
    });

    addSection(`Source ${index + 1}`, "Complaint-Prep Checklist", () => {
      addBulletList([
        "Preserve the direct listing URL for each suspicious entry and record the capture date and time on any screenshot or exported artifact.",
        "Attach trademark ownership, authorization, or registration materials separately before filing any formal complaint or legal action.",
        "Confirm seller identity, marketplace storefront details, and product identifiers before requesting takedown or asserting infringement.",
        "Separate factual observations from legal conclusions; use this dossier as supporting evidence for counsel or trust-and-safety review.",
        "If a direct link becomes unavailable, capture a screenshot of the listing or ad together with the visible seller and product details.",
      ]);
    });

    addSection(`Source ${index + 1}`, "Limitations and Gaps", () => {
      addBulletList(getReportLimitations(report));
    });

    addSection(`Source ${index + 1}`, "Operational Trace", () => {
      addBulletList(
        operationalTrace.length > 0 ? operationalTrace : ["No operational trace was captured."]
      );
    });
  });

  return doc.output("blob");
}

function buildSellerCasePdf(payload) {
  const jsPdfApi = window.jspdf?.jsPDF;
  if (!jsPdfApi) {
    throw new Error("The PDF renderer is not available in this browser session.");
  }

  const doc = new jsPdfApi({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const ensureSpace = (height = 18) => {
    if (cursorY + height <= pageHeight - margin) {
      return;
    }
    doc.addPage();
    cursorY = margin;
  };

  const drawRule = () => {
    ensureSpace(16);
    doc.setDrawColor(204, 198, 188);
    doc.setLineWidth(0.7);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 16;
  };

  const addKicker = (text) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(132, 124, 113);
    doc.text(sanitizePlainText(String(text || "").toUpperCase()), margin, cursorY);
    cursorY += 14;
  };

  const addHeading = (text, size = 18) => {
    const lines = doc.splitTextToSize(sanitizePlainText(text), contentWidth);
    ensureSpace(lines.length * (size + 4));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(54, 46, 39);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * (size + 4);
  };

  const addParagraph = (text, options = {}) => {
    const fontSize = options.fontSize || 11;
    const lineHeight = options.lineHeight || 16;
    const lines = doc.splitTextToSize(sanitizePlainText(text), contentWidth);
    ensureSpace(lines.length * lineHeight + 6);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(options.muted ? 110 : 70, options.muted ? 103 : 62, options.muted ? 95 : 54);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * lineHeight + 6;
  };

  const addBulletList = (items, options = {}) => {
    const values = (items || []).map((item) => sanitizePlainText(item)).filter(Boolean);
    if (values.length === 0) {
      return;
    }
    const fontSize = options.fontSize || 11;
    const lineHeight = options.lineHeight || 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(70, 62, 54);
    values.forEach((item) => {
      const bulletX = margin + 4;
      const textX = margin + 14;
      const lines = doc.splitTextToSize(item, contentWidth - 18);
      ensureSpace(lines.length * lineHeight + 4);
      doc.text("-", bulletX, cursorY);
      doc.text(lines, textX, cursorY);
      cursorY += lines.length * lineHeight + 4;
    });
    cursorY += 2;
  };

  const addDefinitionList = (rows) => {
    const filteredRows = (rows || []).filter(([, value]) => value !== null && value !== undefined && value !== "");
    filteredRows.forEach(([label, value]) => {
      addParagraph(`${sanitizePlainText(label)}: ${sanitizePlainText(value)}`, {
        fontSize: 10.5,
        lineHeight: 15,
      });
    });
  };

  const addSection = (kicker, heading, body) => {
    if (cursorY > margin + 8) {
      drawRule();
    }
    addKicker(kicker);
    addHeading(heading, 16);
    body();
  };

  const profile = payload?.seller_profile || {};
  const selectedListing = payload?.selected_listing || {};
  const officialMatches = payload?.official_product_matches || [];
  const suspectListings = payload?.suspect_listings || [];
  const evidence = payload?.evidence || [];
  const draft = payload?.action_request_draft || {};

  addKicker("TinyDetective");
  addHeading("Seller Enforcement Case Dossier", 22);
  addParagraph(
    "Prepared from the captured TinyDetective seller-case workflow for marketplace trust-and-safety review and internal escalation. This report is an evidence summary, not legal advice.",
    { fontSize: 11.5, lineHeight: 17 }
  );
  addDefinitionList([
    ["Seller case ID", payload?.case_id || "Unavailable"],
    ["Origin investigation", payload?.investigation_id || "Unavailable"],
    ["Status", payload?.status || "Unavailable"],
    ["Created", formatReportDate(payload?.created_at)],
    ["Updated", formatReportDate(payload?.updated_at)],
    ["Marketplace", payload?.marketplace || "Unavailable"],
  ]);

  addSection("Seller Case", "Seller Profile", () => {
    addDefinitionList([
      ["Seller", profile.seller_name || payload?.seller_name || "Unavailable"],
      ["Storefront URL", profile.seller_url || payload?.seller_store_url || "Unavailable"],
      ["Seller ID", profile.seller_id || "Unavailable"],
      ["Rating", profile.rating ?? "Unavailable"],
      ["Ratings count", profile.rating_count ?? "Unavailable"],
      ["Followers", profile.follower_count ?? "Unavailable"],
      ["Location", profile.location || "Unavailable"],
      ["Official-store claims", (profile.official_store_claims || []).join(", ") || "None observed"],
      ["Entry URLs analyzed", (profile.entry_urls || []).length || 0],
      ["Storefront shards analyzed", (profile.storefront_shard_urls || []).length || 0],
    ]);
  });

  addSection("Seller Case", "Seed Listing", () => {
    addDefinitionList([
      ["Listing URL", selectedListing.product_url || payload?.product_url || "Unavailable"],
      ["Title", selectedListing.candidate_product?.title || "Unavailable"],
      ["Seller", selectedListing.candidate_product?.seller_name || payload?.seller_name || "Unavailable"],
      ["Risk score", Number(selectedListing.counterfeit_risk_score || 0).toFixed(2)],
      ["Match score", Number(selectedListing.match_score || 0).toFixed(2)],
      ["Reason", selectedListing.reason || "No reason returned."],
    ]);
  });

  addSection("Seller Case", "Official Product Matches", () => {
    if (!officialMatches.length) {
      addParagraph("No official product matches were stored for this case.", { muted: true });
      return;
    }

    officialMatches.forEach((match, index) => {
      addParagraph(`#${index + 1} ${match.product_url}`, { bold: true, fontSize: 12, lineHeight: 17 });
      addDefinitionList([
        ["Marketplace listing", match.product_url],
        ["Official product URL", match.official_product_url || "Unavailable"],
        ["Match confidence", Number(match.match_confidence || 0).toFixed(2)],
        ["Rationale", match.rationale || "No rationale returned."],
      ]);
    });
  });

  addSection("Seller Case", "Ranked Seller Listings of Concern", () => {
    if (!suspectListings.length) {
      addParagraph("No suspect seller listings were stored in this case.", { muted: true });
      return;
    }

    suspectListings.forEach((listing, index) => {
      addParagraph(
        `#${index + 1} ${listing.candidate_product?.title || listing.product_url}`,
        { bold: true, fontSize: 12, lineHeight: 17 }
      );
      addDefinitionList([
        ["Listing URL", listing.product_url],
        ["Seller", listing.candidate_product?.seller_name || "Unavailable"],
        ["Risk score", Number(listing.counterfeit_risk_score || 0).toFixed(2)],
        ["Match score", Number(listing.match_score || 0).toFixed(2)],
        ["Official comparison basis", listing.comparison_basis_source_url || "Unavailable"],
        ["Official match confidence", Number(listing.comparison_basis_confidence || 0).toFixed(2)],
      ]);
      addBulletList(
        (listing.suspicious_signals || []).map((signal) => `Signal: ${humanizeFieldName(signal)}`),
        { fontSize: 10, lineHeight: 14 }
      );
      addBulletList(
        (listing.evidence || []).slice(0, 5).map((item) => {
          const sourceValue =
            item.source_value !== null && item.source_value !== undefined ? ` | source: ${item.source_value}` : "";
          const candidateValue =
            item.candidate_value !== null && item.candidate_value !== undefined
              ? ` | candidate: ${item.candidate_value}`
              : "";
          return `Evidence - ${humanizeFieldName(item.field)}: ${item.note}${sourceValue}${candidateValue}`;
        }),
        { fontSize: 10, lineHeight: 14 }
      );
    });
  });

  addSection("Seller Case", "Case Evidence", () => {
    addBulletList(
      evidence.length
        ? evidence.map(
            (item) =>
              `${item.title}: ${item.note}${item.reference_url ? ` | reference: ${item.reference_url}` : ""}`
          )
        : ["No seller-case evidence objects were stored."]
    );
  });

  addSection("Seller Case", "Draft Marketplace Request", () => {
    addDefinitionList([
      ["Case title", draft.case_title || "Unavailable"],
      ["Recommended action", draft.recommended_action || "Unavailable"],
      ["Suspected violation", draft.suspected_violation_type || "Unavailable"],
      ["Confidence", Number(draft.confidence || 0).toFixed(2)],
    ]);
    addParagraph(draft.summary || "No case summary returned.");
    addParagraph(draft.reasoning || "No case reasoning returned.", { fontSize: 10.5, lineHeight: 15 });
    addParagraph(draft.request_text || "No request text returned.", { fontSize: 10.5, lineHeight: 15 });
  });

  addSection("Seller Case", "Operational Trace", () => {
    addBulletList(
      (payload?.raw_agent_outputs || []).length
        ? (payload.raw_agent_outputs || []).map((task) => {
            const details = [task.agent_name || "agent", task.status || "unknown", ...buildOperationalTrace(task)];
            return details.join(" | ");
          })
        : ["No operational trace was captured."]
    );
  });

  return doc.output("blob");
}

function revokeCurrentReportPdfUrl() {
  if (!currentReportPdfUrl) {
    return;
  }
  window.URL.revokeObjectURL(currentReportPdfUrl);
  currentReportPdfUrl = null;
}

function resetReportScene() {
  revokeCurrentReportPdfUrl();
  if (reportPdfFrame) {
    reportPdfFrame.removeAttribute("src");
  }
  if (reportOpenButton) {
    reportOpenButton.hidden = true;
  }
  if (reportMeta) {
    setTextContent(reportMeta, "The embedded PDF will be prepared from the captured investigation data.");
  }
  if (reportNote) {
    setTextContent(reportNote, "Generate a report from step 5 to review it here.");
  }
}

function presentPdfReport(blob, payload) {
  const objectUrl = window.URL.createObjectURL(blob);
  revokeCurrentReportPdfUrl();
  currentReportPdfUrl = objectUrl;

  if (reportPdfFrame) {
    reportPdfFrame.src = objectUrl;
  }
  if (reportOpenButton) {
    reportOpenButton.hidden = false;
  }
  if (reportNote) {
    setTextContent(reportNote, "The evidence dossier is ready for review.");
  }
  if (reportMeta) {
    setTextContent(
      reportMeta,
      `Investigation ${payload?.investigation_id || "Unavailable"} | Updated ${formatReportDate(
        payload?.updated_at
      )} | Brand website ${getBrandWebsite(payload)}`
    );
  }
  setPhase("report");
}

function presentSellerCasePdfReport(blob, payload) {
  const objectUrl = window.URL.createObjectURL(blob);
  revokeCurrentReportPdfUrl();
  currentReportPdfUrl = objectUrl;

  if (reportPdfFrame) {
    reportPdfFrame.src = objectUrl;
  }
  if (reportOpenButton) {
    reportOpenButton.hidden = false;
  }
  if (reportNote) {
    setTextContent(reportNote, "The seller enforcement dossier is ready for review.");
  }
  if (reportMeta) {
    setTextContent(
      reportMeta,
      `Seller case ${payload?.case_id || "Unavailable"} | Updated ${formatReportDate(
        payload?.updated_at
      )} | Seller ${payload?.seller_name || "Unavailable"}`
    );
  }
  setPhase("report");
}

function updateGenerateReportButton(payload) {
  if (!generateReportButton) {
    return;
  }

  const reports = payload?.reports || [];
  const canGenerate = reports.some(
    (report) =>
      Boolean(report.source_url) ||
      getRankingSnapshots(report).length > 0 ||
      collectDiscoveredCandidates(report).length > 0 ||
      (report.raw_agent_outputs || []).length > 0
  );

  generateReportButton.disabled = !canGenerate || reportGenerationInFlight;
  generateReportButton.textContent = reportGenerationInFlight
    ? "Generating report..."
    : defaultGenerateReportButtonLabel;
}

function hasStarted(status) {
  return !["pending"].includes(String(status || "pending").toLowerCase());
}

function combineStates(states) {
  const normalizedStates = states.map((status) => String(status || "pending").toLowerCase());
  if (normalizedStates.some((status) => status === "failed")) {
    return "failed";
  }
  if (normalizedStates.some((status) => status === "delayed")) {
    return "delayed";
  }
  if (normalizedStates.some((status) => status === "running")) {
    return "running";
  }
  if (normalizedStates.every((status) => status === "completed")) {
    return "completed";
  }
  if (normalizedStates.some((status) => status === "queued")) {
    return "queued";
  }
  return "pending";
}

function deriveTimelineStates(stepStates) {
  const candidateState = stepStates.candidate_discovery || "pending";
  const triageState = stepStates.candidate_triage || "pending";
  const rankingStarted = hasStarted(stepStates.ranking) || hasStarted(stepStates.research_summary);

  return {
    source: stepStates.source_extraction || "pending",
    search: candidateState,
    candidates: rankingStarted || hasStarted(stepStates.product_comparison)
      ? "completed"
      : combineStates([candidateState, triageState]),
    analysis: rankingStarted
      ? "completed"
      : combineStates([
          stepStates.product_comparison,
          stepStates.evidence,
          stepStates.reasoning_enrichment,
        ]),
    ranking: stepStates.ranking || "pending",
  };
}

function updateCaseGenerateReportButton(payload) {
  if (!caseGenerateReportButton) {
    return;
  }

  const canGenerate =
    Boolean(payload?.selected_listing) ||
    (payload?.suspect_listings || []).length > 0 ||
    (payload?.evidence || []).length > 0 ||
    Boolean(payload?.action_request_draft) ||
    (payload?.raw_agent_outputs || []).length > 0;

  caseGenerateReportButton.disabled = !canGenerate || caseReportGenerationInFlight;
  caseGenerateReportButton.textContent = caseReportGenerationInFlight
    ? "Generating report..."
    : defaultCaseGenerateReportButtonLabel;
}

function getFocusedTimelineStage(timelineStates) {
  const orderedStages = timelineStageDefinitions.map((stage) => [
    stage.key,
    timelineStates[stage.key] || "pending",
  ]);

  for (const status of ["failed", "delayed", "running", "queued"]) {
    const activeStage = orderedStages.find(([, stageStatus]) => stageStatus === status);
    if (activeStage) {
      return activeStage[0];
    }
  }

  const firstPendingIndex = orderedStages.findIndex(([, stageStatus]) => stageStatus === "pending");
  if (firstPendingIndex === 0) {
    return orderedStages[0][0];
  }
  if (firstPendingIndex > 0) {
    return orderedStages[firstPendingIndex - 1][0];
  }

  return orderedStages[orderedStages.length - 1][0];
}

function setFocusedTimelineStage(stageKey, options = {}) {
  const stageIndex = timelineStageDefinitions.findIndex((stage) => stage.key === stageKey);
  if (stageIndex === -1) {
    return;
  }

  const shouldJump = options.immediate || !timelineTrack || !timelineTrack.dataset.ready;
  const stageChanged = activeTimelineStage !== stageKey;
  activeTimelineStage = stageKey;

  if (timelineTrack) {
    if (shouldJump) {
      const previousTransition = timelineTrack.style.transition;
      timelineTrack.style.transition = "none";
      timelineTrack.style.transform = `translateY(-${stageIndex * 100}%)`;
      void timelineTrack.offsetHeight;
      timelineTrack.style.transition = previousTransition;
    } else if (stageChanged) {
      timelineTrack.style.transform = `translateY(-${stageIndex * 100}%)`;
    }
    timelineTrack.dataset.ready = "true";
  }

  timelineStageDefinitions.forEach((stage) => {
    const isActive = stage.key === stageKey;
    timelineStageItems[stage.key]?.classList.toggle("is-active", isActive);
    timelineRailItems[stage.key]?.classList.toggle("is-active", isActive);
  });
}

function getSourcePreviewUrl(report) {
  return report?.source_url || lastSubmittedSourceUrl || parseLines(sourceUrlsInput.value)[0] || "";
}

function getCandidateTasks(report) {
  return (report?.raw_agent_outputs || []).filter((task) => task.agent_name === "candidate_discovery");
}

function getComparisonTasks(report) {
  return (report?.raw_agent_outputs || []).filter((task) => task.agent_name === "product_comparison");
}

function getEvidenceTasks(report) {
  return (report?.raw_agent_outputs || []).filter((task) => task.agent_name === "evidence");
}

function getRankingTask(report) {
  return (report?.raw_agent_outputs || []).find((task) => task.agent_name === "ranking") || null;
}

function hasCompletedRanking(report) {
  return getRankingTask(report)?.status === "completed";
}

function collectDiscoveredCandidates(report) {
  const candidatesByUrl = new Map();

  getCandidateTasks(report).forEach((task) => {
    (task.output_payload?.candidates || []).forEach((candidate) => {
      if (!candidatesByUrl.has(candidate.product_url)) {
        candidatesByUrl.set(candidate.product_url, {
          ...candidate,
          discovery_query: task.output_payload?.search_query || task.input_payload?.search_query || "",
          comparison_site:
            task.output_payload?.comparison_site || task.input_payload?.comparison_site || "",
        });
      }
    });
  });

  return [...candidatesByUrl.values()];
}

function collectCompletedComparisons(report) {
  const evidenceByUrl = new Map();
  getEvidenceTasks(report).forEach((task) => {
    const productUrl = task.input_payload?.product_url;
    if (productUrl && task.output_payload?.evidence) {
      evidenceByUrl.set(productUrl, task.output_payload.evidence);
    }
  });

  return getComparisonTasks(report)
    .filter((task) => task.output_payload?.comparison)
    .map((task) => {
      const comparison = { ...task.output_payload.comparison };
      if ((!comparison.evidence || comparison.evidence.length === 0) && evidenceByUrl.has(comparison.product_url)) {
        comparison.evidence = evidenceByUrl.get(comparison.product_url);
      }
      return comparison;
    });
}

function getRankingSnapshots(report) {
  if (report?.top_matches?.length && hasCompletedRanking(report)) {
    return sortMatchesByCounterfeitRisk(report.top_matches);
  }
  if (!getRankingTask(report)) {
    return [];
  }
  return sortMatchesByCounterfeitRisk(collectCompletedComparisons(report));
}

function parseLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function setPhase(phase) {
  currentPhase = phase;
  body.dataset.phase = phase;
}

function getInvestigationPollIntervalMs() {
  return 1200;
}

function getCasePollIntervalMs() {
  return 1400;
}

function setHistoryMenuOpen(isOpen) {
  if (!historyButton || !historyDropdown) {
    return;
  }

  historyButton.setAttribute("aria-expanded", String(isOpen));
  historyDropdown.hidden = !isOpen;
}

function setCaseHistoryMenuOpen(isOpen) {
  if (!caseHistoryButton || !caseHistoryDropdown) {
    return;
  }

  caseHistoryButton.setAttribute("aria-expanded", String(isOpen));
  caseHistoryDropdown.hidden = !isOpen;
}

function setComposerInvalid(isInvalid) {
  promptComposer.classList.toggle("is-invalid", isInvalid);
}

function syncPromptHeight() {
  sourceUrlsInput.style.height = "0px";
  sourceUrlsInput.style.height = `${Math.min(sourceUrlsInput.scrollHeight, 240)}px`;
}

function setStatus(status) {
  const normalizedStatus = String(status || "idle").toLowerCase();
  statusPill.dataset.status = normalizedStatus;
  statusPill.textContent = statusLabels[normalizedStatus] || status;
}

function setCaseStatus(status) {
  if (!caseStatusPill) {
    return;
  }
  const normalizedStatus = String(status || "idle").toLowerCase();
  caseStatusPill.dataset.status = normalizedStatus;
  caseStatusPill.textContent = statusLabels[normalizedStatus] || status;
}

function setSubmitting(isSubmitting) {
  runButton.disabled = isSubmitting;
  runButton.setAttribute("aria-busy", String(isSubmitting));
  runButton.textContent = isSubmitting ? "Investigating..." : defaultRunButtonLabel;
}

function getPersistedInvestigationId() {
  try {
    return window.localStorage.getItem(persistedInvestigationStorageKey);
  } catch {
    return null;
  }
}

function persistInvestigationId(investigationId) {
  try {
    window.localStorage.setItem(persistedInvestigationStorageKey, investigationId);
  } catch {
    // Ignore local storage failures and keep the live in-memory flow working.
  }
}

function clearPersistedInvestigationId() {
  try {
    window.localStorage.removeItem(persistedInvestigationStorageKey);
  } catch {
    // Ignore local storage failures and keep the live in-memory flow working.
  }
  currentInvestigationId = null;
  renderPastRuns(pastRunsCache);
}

function getPersistedCaseId() {
  try {
    return window.localStorage.getItem(persistedCaseStorageKey);
  } catch {
    return null;
  }
}

function persistCaseId(caseId) {
  try {
    window.localStorage.setItem(persistedCaseStorageKey, caseId);
  } catch {
    // Ignore local storage failures and keep the live in-memory flow working.
  }
}

function clearPersistedCaseId() {
  try {
    window.localStorage.removeItem(persistedCaseStorageKey);
  } catch {
    // Ignore local storage failures and keep the live in-memory flow working.
  }
  currentCaseId = null;
  renderPastCases(pastCasesCache);
}

function selectCase(caseId) {
  currentCaseId = caseId;
  persistCaseId(caseId);
  renderPastCases(pastCasesCache);
}

function selectInvestigation(investigationId) {
  currentInvestigationId = investigationId;
  persistInvestigationId(investigationId);
  renderPastRuns(pastRunsCache);
}

function loadInvestigation(investigationId) {
  if (!investigationId) {
    return;
  }
  if (pollTimer) {
    window.clearTimeout(pollTimer);
  }
  selectInvestigation(investigationId);
  resetReportScene();
  setPhase("progress");
  fetchInvestigation(investigationId);
}

function startNewInvestigation() {
  if (pollTimer) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (casePollTimer) {
    window.clearTimeout(casePollTimer);
    casePollTimer = null;
  }
  clearPersistedInvestigationId();
  clearPersistedCaseId();
  latestInvestigationPayload = null;
  latestCasePayload = null;
  resetReportScene();
  resetCaseWorkspace();
  setComposerInvalid(false);
  setStatus("idle");
  resetProgressTracking();
  renderTimeline(null);
  renderEmptyState("Add official product page URLs to compare them against live marketplace listings.");
  updateGenerateReportButton(null);
  setSubmitting(false);
  setHistoryMenuOpen(false);
  setCaseHistoryMenuOpen(false);
  sourceUrlsInput.value = "";
  syncPromptHeight();
  setPhase("prompt");
  sourceUrlsInput.focus();
}

function sortMatchesByCounterfeitRisk(matches) {
  return [...(matches || [])].sort((left, right) => {
    const riskDelta = (right.counterfeit_risk_score || 0) - (left.counterfeit_risk_score || 0);
    if (riskDelta !== 0) {
      return riskDelta;
    }
    return (right.match_score || 0) - (left.match_score || 0);
  });
}

function canBuildSellerCase() {
  return Boolean(currentInvestigationId) && String(latestInvestigationPayload?.status || "").toLowerCase() === "completed";
}

function configureBuildCaseButton(button, report, match) {
  if (!button) {
    return;
  }

  button.dataset.sourceUrl = report?.source_url || "";
  button.dataset.productUrl = match?.product_url || "";
  button.dataset.marketplace = match?.marketplace || "";
  button.dataset.sellerName = match?.candidate_product?.seller_name || "";

  const isEnabled = canBuildSellerCase() && Boolean(button.dataset.sourceUrl) && Boolean(button.dataset.productUrl);
  button.disabled = !isEnabled;
  if (isEnabled) {
    button.removeAttribute("title");
  } else {
    button.title = currentInvestigationId
      ? "Complete the investigation before building a seller case."
      : "Start and finish an investigation before building a seller case.";
  }
}

function sortPastRuns(runs) {
  return [...runs].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    return rightTime - leftTime;
  });
}

function formatRunTimestamp(value) {
  if (!value) {
    return "Unknown time";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown time";
  }

  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeSavedUrl(urlValue) {
  if (!urlValue) {
    return {
      title: "",
      detail: "",
      full: "",
    };
  }

  try {
    const url = new URL(urlValue);
    const pathname = decodeURIComponent(url.pathname || "/").replace(/\/$/, "") || "/";
    return {
      title: url.hostname.replace(/^www\./, ""),
      detail: pathname === "/" ? "Homepage" : pathname,
      full: url.toString(),
    };
  } catch {
    return {
      title: String(urlValue),
      detail: "",
      full: String(urlValue),
    };
  }
}

function formatRunSource(run) {
  const sourceUrl = run?.primary_source_url;
  const sourceTitle = sanitizePlainText(run?.primary_source_title || "");

  if (!sourceUrl) {
    return {
      title: sourceTitle || "Investigation",
      detail: "No source URL saved",
      full: "",
    };
  }

  try {
    const url = new URL(sourceUrl);
    const pathname = decodeURIComponent(url.pathname || "/").replace(/\/$/, "") || "/";
    return {
      title: sourceTitle || url.hostname.replace(/^www\./, ""),
      detail: pathname === "/" ? "Homepage" : pathname,
      full: url.toString(),
    };
  } catch {
    return {
      title: sourceTitle || sourceUrl,
      detail: "",
      full: sourceUrl,
    };
  }
}

function formatRunMeta(run, source) {
  if (run.error) {
    return run.error;
  }

  const parts = [];
  if (source.detail) {
    parts.push(source.detail);
  }
  parts.push(`${run.source_count || 0} source${run.source_count === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function createPastRunItem(run) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "past-run-item";
  button.dataset.investigationId = run.investigation_id;

  const header = document.createElement("div");
  header.className = "past-run-header";

  const status = document.createElement("span");
  status.className = "past-run-status";
  status.dataset.status = String(run.status || "queued").toLowerCase();

  const time = document.createElement("span");
  time.className = "past-run-time";

  header.append(status, time);

  const title = document.createElement("strong");
  title.className = "past-run-title";

  const meta = document.createElement("span");
  meta.className = "past-run-meta";

  button.append(header, title, meta);
  return button;
}

function renderPastRuns(runs) {
  if (!pastRunsNode) {
    return;
  }

  if (!runs || runs.length === 0) {
    pastRunsNode.innerHTML = '<p class="empty-state">No saved investigations yet.</p>';
    return;
  }

  const existingItems = new Map(
    [...pastRunsNode.querySelectorAll(".past-run-item")].map((node) => [node.dataset.investigationId, node])
  );

  runs.forEach((run) => {
    const investigationId = run.investigation_id;
    const source = formatRunSource(run);

    let item = existingItems.get(investigationId);
    if (!item) {
      item = createPastRunItem(run);
    } else {
      existingItems.delete(investigationId);
    }

    item.classList.toggle("is-active", investigationId === currentInvestigationId);
    item.setAttribute("aria-pressed", investigationId === currentInvestigationId ? "true" : "false");
    item.title = source.full || source.title;
    item.querySelector(".past-run-status").dataset.status = String(run.status || "queued").toLowerCase();
    setTextContent(
      item.querySelector(".past-run-status"),
      statusLabels[String(run.status || "queued").toLowerCase()] || run.status
    );
    setTextContent(item.querySelector(".past-run-time"), formatRunTimestamp(run.created_at));
    setTextContent(item.querySelector(".past-run-title"), source.title);
    item.querySelector(".past-run-meta").dataset.tone = run.error ? "error" : "default";
    setTextContent(item.querySelector(".past-run-meta"), formatRunMeta(run, source));

    pastRunsNode.appendChild(item);
  });

  existingItems.forEach((node) => node.remove());
}

function upsertPastRun(run) {
  const nextRuns = [...pastRunsCache];
  const existingIndex = nextRuns.findIndex((item) => item.investigation_id === run.investigation_id);
  if (existingIndex === -1) {
    nextRuns.push(run);
  } else {
    nextRuns[existingIndex] = { ...nextRuns[existingIndex], ...run };
  }
  pastRunsCache = sortPastRuns(nextRuns);
  renderPastRuns(pastRunsCache);
}

function upsertPastRunFromInvestigation(payload) {
  const existingRun = pastRunsCache.find((item) => item.investigation_id === payload.investigation_id) || null;
  const nextRun = {
    investigation_id: payload.investigation_id,
    status: payload.status,
    primary_source_url: payload.reports?.[0]?.source_url || existingRun?.primary_source_url || null,
    primary_source_title:
      payload.reports?.[0]?.extracted_source_product?.product_name ||
      payload.reports?.[0]?.extracted_source_product?.model ||
      payload.reports?.[0]?.extracted_source_product?.brand ||
      existingRun?.primary_source_title ||
      null,
    source_count: payload.reports?.length || existingRun?.source_count || 0,
    error: payload.error || null,
    created_at: payload.created_at,
    updated_at: payload.updated_at,
  };
  upsertPastRun(nextRun);
}

function sortPastCases(cases) {
  return [...cases].sort((left, right) => {
    const leftTime = new Date(left.updated_at || left.created_at).getTime();
    const rightTime = new Date(right.updated_at || right.created_at).getTime();
    return rightTime - leftTime;
  });
}

function formatCaseSource(caseItem) {
  const sellerName = sanitizePlainText(caseItem?.seller_name || "");
  const marketplace = sanitizePlainText(caseItem?.marketplace || "");
  const listing = describeSavedUrl(caseItem?.product_url);

  return {
    title: sellerName || marketplace || listing.title || "Seller case",
    detail: marketplace || listing.title || "Unknown marketplace",
    listingDetail: listing.detail,
    full: listing.full || caseItem?.product_url || caseItem?.source_url || "",
  };
}

function formatCaseMeta(caseItem, source) {
  if (caseItem.error) {
    return caseItem.error;
  }

  const sourceReference = describeSavedUrl(caseItem?.source_url);
  const parts = [];
  if (source.detail) {
    parts.push(source.detail);
  }
  if (source.listingDetail && source.listingDetail !== "Homepage") {
    parts.push(source.listingDetail);
  }
  if (sourceReference.title) {
    parts.push(`Source ${sourceReference.title}`);
  }
  return parts.join(" · ");
}

function createPastCaseItem(caseItem) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "past-run-item";
  button.dataset.caseId = caseItem.case_id;

  const header = document.createElement("div");
  header.className = "past-run-header";

  const status = document.createElement("span");
  status.className = "past-run-status";
  status.dataset.status = String(caseItem.status || "queued").toLowerCase();

  const time = document.createElement("span");
  time.className = "past-run-time";

  header.append(status, time);

  const title = document.createElement("strong");
  title.className = "past-run-title";

  const meta = document.createElement("span");
  meta.className = "past-run-meta";

  button.append(header, title, meta);
  return button;
}

function renderPastCases(cases) {
  if (!pastCasesNode) {
    return;
  }

  if (!cases || cases.length === 0) {
    pastCasesNode.innerHTML = '<p class="empty-state">No saved seller cases yet.</p>';
    return;
  }

  const existingItems = new Map(
    [...pastCasesNode.querySelectorAll(".past-run-item")].map((node) => [node.dataset.caseId, node])
  );

  cases.forEach((caseItem) => {
    const caseId = caseItem.case_id;
    const source = formatCaseSource(caseItem);

    let item = existingItems.get(caseId);
    if (!item) {
      item = createPastCaseItem(caseItem);
    } else {
      existingItems.delete(caseId);
    }

    item.classList.toggle("is-active", caseId === currentCaseId);
    item.setAttribute("aria-pressed", caseId === currentCaseId ? "true" : "false");
    item.title = source.full || source.title;
    item.querySelector(".past-run-status").dataset.status = String(caseItem.status || "queued").toLowerCase();
    setTextContent(
      item.querySelector(".past-run-status"),
      statusLabels[String(caseItem.status || "queued").toLowerCase()] || caseItem.status
    );
    setTextContent(item.querySelector(".past-run-time"), formatRunTimestamp(caseItem.updated_at || caseItem.created_at));
    setTextContent(item.querySelector(".past-run-title"), source.title);
    item.querySelector(".past-run-meta").dataset.tone = caseItem.error ? "error" : "default";
    setTextContent(item.querySelector(".past-run-meta"), formatCaseMeta(caseItem, source));

    pastCasesNode.appendChild(item);
  });

  existingItems.forEach((node) => node.remove());
}

function upsertPastCase(caseItem) {
  const nextCases = [...pastCasesCache];
  const existingIndex = nextCases.findIndex((item) => item.case_id === caseItem.case_id);
  if (existingIndex === -1) {
    nextCases.push(caseItem);
  } else {
    nextCases[existingIndex] = { ...nextCases[existingIndex], ...caseItem };
  }
  pastCasesCache = sortPastCases(nextCases);
  renderPastCases(pastCasesCache);
}

function upsertPastCaseFromCasePayload(payload) {
  const existingCase = pastCasesCache.find((item) => item.case_id === payload.case_id) || null;
  const nextCase = {
    case_id: payload.case_id,
    status: payload.status,
    seller_name: payload.seller_name || existingCase?.seller_name || null,
    marketplace:
      payload.marketplace ||
      payload.selected_listing?.marketplace ||
      existingCase?.marketplace ||
      null,
    source_url: payload.source_url || existingCase?.source_url || "",
    product_url: payload.product_url || existingCase?.product_url || "",
    error: payload.error || null,
    created_at: payload.created_at || existingCase?.created_at,
    updated_at: payload.updated_at || existingCase?.updated_at || payload.created_at,
  };
  upsertPastCase(nextCase);
}

async function refreshPastRuns() {
  if (!pastRunsNode) {
    return;
  }

  try {
    const response = await fetch("/investigations?limit=12");
    if (!response.ok) {
      throw new Error("Unable to load investigation history.");
    }
    pastRunsCache = sortPastRuns(await response.json());
    renderPastRuns(pastRunsCache);
  } catch {
    if (pastRunsCache.length === 0) {
      pastRunsNode.innerHTML =
        '<p class="empty-state">Saved investigations could not be loaded right now.</p>';
    }
  }
}

async function refreshPastCases() {
  if (!pastCasesNode) {
    return;
  }

  try {
    const response = await fetch("/cases?limit=12");
    if (!response.ok) {
      throw new Error("Unable to load seller case history.");
    }
    pastCasesCache = sortPastCases(await response.json());
    renderPastCases(pastCasesCache);
  } catch {
    if (pastCasesCache.length === 0) {
      pastCasesNode.innerHTML = '<p class="empty-state">Saved seller cases could not be loaded right now.</p>';
    }
  }
}

function renderEmptyState(message) {
  if (!resultsNode) {
    return;
  }
  resultsNode.innerHTML = `<p class="empty-state">${message}</p>`;
}

function setTextContent(node, value) {
  const nextValue = value ?? "";
  if (node.textContent !== nextValue) {
    node.textContent = nextValue;
  }
}

function setInnerHtml(node, value) {
  const nextValue = value ?? "";
  if (node.dataset.renderedHtml !== nextValue) {
    node.innerHTML = nextValue;
    node.dataset.renderedHtml = nextValue;
  }
}

function updateProgressUI({ overview, detail, percent, stepStates, timelineStates, focusedStage }) {
  progressOverview.textContent = overview;
  progressText.textContent = detail;
  progressFill.style.width = `${percent}%`;
  progressTrack.setAttribute("aria-valuenow", String(percent));

  const nextTimelineStates = timelineStates || deriveTimelineStates(stepStates);
  timelineStageDefinitions.forEach((stage) => {
    const node = timelineStageItems[stage.key];
    const railNode = timelineRailItems[stage.key];
    const status = nextTimelineStates[stage.key] || "pending";
    node.dataset.status = status;
    node.querySelector(".timeline-step-state").textContent = timelineStateLabels[status] || status;
    if (railNode) {
      railNode.dataset.status = status;
    }
  });

  setFocusedTimelineStage(focusedStage || getFocusedTimelineStage(nextTimelineStates));
}

function resetProgressTracking() {
  const stepStates = Object.fromEntries(progressStepDefinitions.map((step) => [step.key, "pending"]));
  updateProgressUI({
    overview: "No investigation running yet.",
    detail: "Waiting for an investigation to start.",
    percent: 0,
    stepStates,
  });
  setFocusedTimelineStage("source", { immediate: true });
  renderTimeline(null);
}

function getActiveTask(report) {
  const tasks = report?.raw_agent_outputs || [];
  return (
    [...tasks].reverse().find((task) => task.status === "delayed") ||
    [...tasks].reverse().find((task) => task.status === "running") ||
    [...tasks].reverse().find((task) => task.status === "failed") ||
    [...tasks].reverse()[0] ||
    null
  );
}

function formatRelativeTime(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffSeconds < 3600) {
    return `${Math.round(diffSeconds / 60)}m ago`;
  }
  return `${Math.round(diffSeconds / 3600)}h ago`;
}

function describeProviderState(task) {
  if (!task) {
    return "";
  }

  const parts = [];
  if (task.provider_status) {
    parts.push(`TinyFish ${task.provider_status}`);
  }

  const heartbeat = formatRelativeTime(task.last_heartbeat_at);
  if (heartbeat) {
    parts.push(`heartbeat ${heartbeat}`);
  }

  const progress = formatRelativeTime(task.last_progress_at);
  if (progress && task.last_progress_at !== task.last_heartbeat_at) {
    parts.push(`last material update ${progress}`);
  }

  if (task.provider_run_id) {
    parts.push(`run ${String(task.provider_run_id).slice(0, 8)}`);
  }

  return parts.join(" · ");
}

function deriveReportStepStates(report) {
  const tasks = report?.raw_agent_outputs || [];

  return Object.fromEntries(
    progressStepDefinitions.map((step, stepIndex) => {
      const matchingTasks = tasks.filter((task) => task.agent_name === step.key);
      const laterStepStarted = tasks.some(
        (task) => (progressStepIndex[task.agent_name] ?? -1) > stepIndex
      );

      if (matchingTasks.some((task) => task.status === "failed")) {
        return [step.key, "failed"];
      }
      if (matchingTasks.some((task) => task.status === "delayed")) {
        return [step.key, "delayed"];
      }
      if (matchingTasks.some((task) => task.status === "running")) {
        return [step.key, "running"];
      }
      if (matchingTasks.length > 0 && matchingTasks.every((task) => task.status === "completed")) {
        return [step.key, "completed"];
      }
      if (laterStepStarted) {
        return [step.key, "completed"];
      }
      if (tasks.length === 0 && stepIndex === 0) {
        return [step.key, "queued"];
      }
      return [step.key, "pending"];
    })
  );
}

function getActiveReportIndex(reports) {
  const runningIndex = reports.findIndex((report) =>
    (report.raw_agent_outputs || []).some((task) => ["running", "delayed"].includes(task.status))
  );
  if (runningIndex !== -1) {
    return runningIndex;
  }

  const failedIndex = reports.findIndex((report) =>
    report.error || (report.raw_agent_outputs || []).some((task) => task.status === "failed")
  );
  if (failedIndex !== -1) {
    return failedIndex;
  }

  const nextQueuedIndex = reports.findIndex((report) => (report.raw_agent_outputs || []).length === 0);
  if (nextQueuedIndex === 0) {
    return 0;
  }
  if (nextQueuedIndex > 0) {
    return nextQueuedIndex - 1;
  }

  return Math.max(reports.length - 1, 0);
}

function isReportComplete(report) {
  const stepStates = deriveReportStepStates(report);
  return progressStepDefinitions.every((step) => stepStates[step.key] === "completed");
}

function calculateProgressPercent(reports, investigationStatus) {
  if (!reports.length) {
    return investigationStatus === "queued" ? 4 : 0;
  }

  const totalUnits = reports.length * progressStepDefinitions.length;
  let completedUnits = 0;

  reports.forEach((report) => {
    const stepStates = deriveReportStepStates(report);
    completedUnits += progressStepDefinitions.filter(
      (step) => stepStates[step.key] === "completed"
    ).length;
    if (
      progressStepDefinitions.some((step) =>
        ["running", "delayed"].includes(stepStates[step.key])
      )
    ) {
      completedUnits += 0.5;
    }
  });

  if (investigationStatus === "completed") {
    return 100;
  }

  return Math.max(0, Math.min(99, Math.round((completedUnits / totalUnits) * 100)));
}

function renderProgressTracking(payload) {
  const reports = payload.reports || [];
  const activeReport = reports[getActiveReportIndex(reports)] || null;
  const activeTask = getActiveTask(activeReport);
  const activeStepStates = activeReport
    ? deriveReportStepStates(activeReport)
    : Object.fromEntries(progressStepDefinitions.map((step) => [step.key, "pending"]));
  const timelineStates = deriveTimelineStates(activeStepStates);
  const focusedTimelineStage = getFocusedTimelineStage(timelineStates);
  const focusedTimelineLabel =
    timelineStageDefinitions.find((stage) => stage.key === focusedTimelineStage)?.label ||
    "Investigation";
  const activeStep =
    progressStepDefinitions.find((step) => activeStepStates[step.key] === "delayed") ||
    progressStepDefinitions.find((step) => activeStepStates[step.key] === "running") ||
    progressStepDefinitions.find((step) => activeStepStates[step.key] === "failed") ||
    progressStepDefinitions.find((step) => activeStepStates[step.key] === "queued") ||
    progressStepDefinitions.find((step) => activeStepStates[step.key] === "pending");
  const completedReports = reports.filter(isReportComplete).length;
  const sourcePosition = activeReport ? getActiveReportIndex(reports) + 1 : 0;
  const totalSources = reports.length;

  let overview = "No investigation running yet.";
  let detail = "Waiting for an investigation to start.";

  if (payload.status === "queued") {
    overview = totalSources > 1 ? `Source 1 of ${totalSources} · ${focusedTimelineLabel}` : focusedTimelineLabel;
    detail = activeReport?.summary || "Preparing the investigation context.";
  } else if (payload.status === "running") {
    overview =
      totalSources > 1
        ? `Source ${sourcePosition} of ${totalSources} · ${focusedTimelineLabel}`
        : focusedTimelineLabel;
    detail = activeReport?.summary || "Investigation is in progress.";
  } else if (payload.status === "delayed") {
    overview =
      totalSources > 1
        ? `Source ${sourcePosition} of ${totalSources} · ${focusedTimelineLabel}`
        : focusedTimelineLabel;
    detail = activeReport?.summary || "TinyFish is still working on the active step.";
  } else if (payload.status === "completed") {
    overview =
      totalSources > 1
        ? `Completed ${completedReports} of ${totalSources} · ${focusedTimelineLabel}`
        : focusedTimelineLabel;
    detail = activeReport?.summary || "The investigation finished successfully.";
  } else if (payload.status === "failed") {
    overview = focusedTimelineLabel;
    detail = payload.error || activeReport?.error || "The investigation ended with an error.";
  }

  if (activeStep?.label && payload.status !== "completed") {
    detail = `${activeStep.label}. ${detail}`;
  }

  const providerState = describeProviderState(activeTask);
  if (providerState) {
    detail = `${detail} ${detail.endsWith(".") ? "" : "."} ${providerState}`;
  }

  updateProgressUI({
    overview,
    detail,
    percent: calculateProgressPercent(reports, payload.status),
    stepStates: activeStepStates,
    timelineStates,
    focusedStage: focusedTimelineStage,
  });

  renderTimeline(activeReport);
}

function renderSourceStage(report) {
  const sourceUrl = getSourcePreviewUrl(report);
  const product = report?.extracted_source_product || null;

  setTextContent(timelineSourceUrl, sourceUrl || "No source URL selected yet.");
  timelineSourceLink.hidden = !sourceUrl;
  if (sourceUrl) {
    timelineSourceLink.href = sourceUrl;
    if (timelineSourceFrame.dataset.sourceUrl !== sourceUrl) {
      timelineSourceFrame.src = sourceUrl;
      timelineSourceFrame.dataset.sourceUrl = sourceUrl;
    }
  } else if (timelineSourceFrame.dataset.sourceUrl) {
    timelineSourceFrame.removeAttribute("src");
    timelineSourceFrame.dataset.sourceUrl = "";
  }

  if (!sourceUrl) {
    setTextContent(timelineNotes.source, "Waiting for the official product page.");
    setInnerHtml(
      timelineSourceMeta,
      '<p class="empty-state">The source page will appear here after you start an investigation.</p>'
    );
    return;
  }

  const metaHtml = product
    ? `
      <span class="meta-label">Extracted profile</span>
      <div class="meta-title">${escapeHtml(
        `${product.brand || "Unknown brand"} · ${product.product_name || "Unknown product"}`
      )}</div>
      <div class="meta-grid">
        <div><strong>Category</strong>${escapeHtml(product.category || "Unavailable")}</div>
        <div><strong>SKU</strong>${escapeHtml(product.sku || "Unavailable")}</div>
        <div><strong>Model</strong>${escapeHtml(product.model || "Unavailable")}</div>
        <div><strong>Price</strong>${escapeHtml(
          product.price !== null && product.price !== undefined
            ? formatCompactCurrency(product.price, product.currency)
            : "Unavailable"
        )}</div>
      </div>
    `
    : `
      <span class="meta-label">Source status</span>
      <div class="meta-title">${escapeHtml(formatHostname(sourceUrl))}</div>
      <p class="empty-state">Extracted source attributes will populate here once the source step finishes.</p>
    `;

  setTextContent(
    timelineNotes.source,
    product
      ? "Official product details extracted from the source page."
      : "Showing the live source page while extraction is still running."
  );
  setInnerHtml(timelineSourceMeta, metaHtml);
}

function renderSearchStage(report) {
  const searchTasks = getCandidateTasks(report);
  const visibleSearchTasks = searchTasks.slice(0, 3);

  if (searchTasks.length === 0) {
    setTextContent(
      timelineNotes.search,
      "Search queries will appear here as TinyFish fans out across marketplaces."
    );
    setInnerHtml(
      timelineSearchLog,
      '<p class="empty-state">No marketplace queries have started yet.</p>'
    );
    return;
  }

  setTextContent(
    timelineNotes.search,
    `Tracking ${searchTasks.length} marketplace quer${searchTasks.length === 1 ? "y" : "ies"} live.`
  );

  setInnerHtml(
    timelineSearchLog,
    visibleSearchTasks
      .map((task) => {
        const query =
          task.output_payload?.search_query || task.input_payload?.search_query || "Waiting for query";
        const comparisonSite =
          task.output_payload?.comparison_site || task.input_payload?.comparison_site || "";
        const candidateCount = task.output_payload?.candidate_count;
        const runtime = task.output_payload?.runtime || {};
        const duration = formatElapsedSeconds(runtime.tinyfish_elapsed_seconds);
        const rightLabel =
          candidateCount !== undefined
            ? `${candidateCount} hit${candidateCount === 1 ? "" : "s"}`
            : progressStateLabels[task.status] || task.status;

        return `
          <div class="search-log-item" data-status="${escapeHtml(task.status)}">
            <div class="search-log-header">
              <span class="search-query">${escapeHtml(query)}</span>
              <span class="candidate-chip">${escapeHtml(rightLabel)}</span>
            </div>
            <p class="search-log-meta">
              ${escapeHtml(formatHostname(comparisonSite))}
              ${duration ? ` · ${escapeHtml(duration)} elapsed` : ""}
              ${describeProviderState(task) ? ` · ${escapeHtml(describeProviderState(task))}` : ""}
            </p>
          </div>
        `;
      })
      .join("")
  );
}

function renderCandidateStage(report) {
  const candidates = collectDiscoveredCandidates(report);
  const visibleCandidates = candidates.slice(0, 4);

  if (candidates.length === 0) {
    setTextContent(
      timelineNotes.candidates,
      "Candidate listings will stream in as search results are captured."
    );
    setInnerHtml(
      timelineCandidateStream,
      '<p class="empty-state">No candidate listings have been captured yet.</p>'
    );
    return;
  }

  setTextContent(
    timelineNotes.candidates,
    `${candidates.length} unique candidate listing${candidates.length === 1 ? "" : "s"} captured so far.`
  );

  setInnerHtml(
    timelineCandidateStream,
    visibleCandidates
      .map((candidate) => {
        const price =
          candidate.price !== null && candidate.price !== undefined
            ? formatCompactCurrency(candidate.price, candidate.currency)
            : "Price unavailable";
        return `
          <article class="candidate-card">
            <div class="candidate-card-head">
              <span class="candidate-marketplace">${escapeHtml(
                candidate.marketplace || formatHostname(candidate.product_url)
              )}</span>
              <span class="candidate-query">${escapeHtml(candidate.discovery_query || "live query")}</span>
            </div>
            <p class="candidate-title">${escapeHtml(
              candidate.title || candidate.model || candidate.product_url
            )}</p>
            <div class="candidate-link">${escapeHtml(candidate.product_url)}</div>
            <div class="candidate-meta">
              <span class="candidate-chip">${escapeHtml(price)}</span>
              <span class="candidate-chip">${escapeHtml(candidate.sku || "No SKU")}</span>
            </div>
          </article>
        `;
      })
      .join("")
  );
}

function getComparisonThreads(report) {
  return collectCompletedComparisons(report).map((comparison) => {
    const fields = [
      ...(comparison.evidence || []).map((item) => item.field),
      ...(comparison.suspicious_signals || []),
      ...(comparison.official_store_signals || []),
    ].filter(Boolean);

    return {
      ...comparison,
      fields: [...new Set(fields)].slice(0, 4),
    };
  });
}

function renderAnalysisStage(report) {
  const threads = getComparisonThreads(report);
  const visibleThreads = threads.slice(0, 1);
  const activeTasks = getComparisonTasks(report).filter(
    (task) => !task.output_payload?.comparison || ["running", "delayed", "failed"].includes(task.status)
  );
  const visibleActiveTasks = activeTasks.slice(0, 3);
  const sourceProduct = report?.extracted_source_product || null;

  if (threads.length === 0) {
    setTextContent(
      timelineNotes.analysis,
      "Comparison signals will assemble here once candidate pages are inspected."
    );
    setInnerHtml(
      timelineSignalGraph,
      `
        <div class="graph-source-node">
          <strong>Source</strong>
          <div>${escapeHtml(sourceProduct?.product_name || "Waiting for extracted source product")}</div>
        </div>
        <p class="empty-state">No comparison graph is available yet.</p>
      `
    );
  } else {
    setTextContent(
      timelineNotes.analysis,
      `Built ${threads.length} reasoning thread${threads.length === 1 ? "" : "s"} from completed comparisons.`
    );
    setInnerHtml(
      timelineSignalGraph,
      `
        <div class="graph-source-node">
          <strong>Source</strong>
          <div>${escapeHtml(
            sourceProduct?.product_name || sourceProduct?.model || report?.source_url || "Source product"
          )}</div>
        </div>
        ${visibleThreads
          .map(
            (thread) => `
              <div class="graph-thread">
                <div class="graph-link">
                  ${(thread.fields || [])
                    .map((field) => `<span class="graph-chip">${escapeHtml(field)}</span>`)
                    .join("")}
                  <span class="graph-arrow">→</span>
                </div>
                <div class="graph-candidate">
                  <strong>${escapeHtml(thread.marketplace || formatHostname(thread.product_url))}</strong>
                  <div>${escapeHtml(
                    thread.candidate_product?.title || thread.candidate_product?.model || thread.product_url
                  )}</div>
                </div>
                <p class="graph-reason">${escapeHtml(formatReasonText(thread.reason || "No explanation returned."))}</p>
              </div>
            `
          )
          .join("")}
      `
    );
  }

  if (threads.length === 0 && activeTasks.length === 0) {
    setInnerHtml(
      timelineAnalysisLog,
      '<p class="empty-state">Reasoning traces will appear here once comparison begins.</p>'
    );
    return;
  }

  const logItems =
    threads.length > 0
      ? visibleThreads.map(
          (thread) => `
            <div class="analysis-log-item">
              <div class="analysis-log-head">
                <span class="analysis-log-title">${escapeHtml(
                  thread.candidate_product?.title || thread.product_url
                )}</span>
                <span class="ranking-chip">Risk ${escapeHtml(
                  Number(thread.counterfeit_risk_score || 0).toFixed(1)
                )}</span>
              </div>
              <p class="analysis-log-text">${escapeHtml(
                formatReasonText(thread.reason || "No explanation returned.")
              )}</p>
            </div>
          `
        )
      : visibleActiveTasks.map(
          (task) => `
            <div class="analysis-log-item">
              <div class="analysis-log-head">
                <span class="analysis-log-title">${escapeHtml(
                  formatHostname(task.input_payload?.product_url || "candidate listing")
                )}</span>
                <span class="ranking-chip">${escapeHtml(progressStateLabels[task.status] || task.status)}</span>
              </div>
              <p class="analysis-log-meta">${escapeHtml(
                describeProviderState(task) || "TinyFish is still inspecting this listing."
              )}</p>
            </div>
          `
        );

  setInnerHtml(timelineAnalysisLog, logItems.join(""));
}

function createRankingItem(productUrl) {
  const item = document.createElement("li");
  item.className = "ranking-item";
  item.dataset.productUrl = productUrl;

  const rank = document.createElement("span");
  rank.className = "ranking-rank";
  const main = document.createElement("div");
  main.className = "ranking-main";
  const title = document.createElement("p");
  title.className = "ranking-title";
  const url = document.createElement("a");
  url.className = "ranking-url ranking-url-link";
  url.target = "_blank";
  url.rel = "noreferrer";
  const metadata = document.createElement("div");
  metadata.className = "ranking-metadata";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ranking-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Show reasoning");
  const chevron = document.createElement("span");
  chevron.className = "ranking-chevron";
  chevron.setAttribute("aria-hidden", "true");
  toggle.appendChild(chevron);
  const detailBody = document.createElement("div");
  detailBody.className = "ranking-details-body";
  detailBody.hidden = true;

  main.append(title, url, metadata);
  item.append(rank, main, toggle, detailBody);
  return item;
}

function renderRankingStage(report) {
  const rankingItems = getRankingSnapshots(report).slice(0, 5);

  if (rankingItems.length === 0) {
    setTextContent(timelineNotes.ranking, "Matches will settle into rank as scores firm up.");
    setInnerHtml(
      timelineRankingList,
      '<li class="empty-state">No ranked matches are available yet.</li>'
    );
    return;
  }

  setTextContent(
    timelineNotes.ranking,
    report?.top_matches?.length
      ? `Ranking finalized across ${rankingItems.length} suspicious match${rankingItems.length === 1 ? "" : "es"}.`
      : `Showing a provisional order from ${rankingItems.length} completed comparison${rankingItems.length === 1 ? "" : "s"}.`
  );

  const previousPositions = new Map(
    [...timelineRankingList.querySelectorAll(".ranking-item")].map((node) => [
      node.dataset.productUrl,
      node.getBoundingClientRect(),
    ])
  );
  const existingItems = new Map(
    [...timelineRankingList.querySelectorAll(".ranking-item")].map((node) => [node.dataset.productUrl, node])
  );
  [...timelineRankingList.querySelectorAll(".empty-state")].forEach((node) => node.remove());

  rankingItems.forEach((match, index) => {
    const productUrl = String(match.product_url);
    let item = existingItems.get(productUrl);
    if (!item) {
      item = createRankingItem(productUrl);
    } else {
      existingItems.delete(productUrl);
    }

    setTextContent(item.querySelector(".ranking-rank"), String(index + 1).padStart(2, "0"));
    setTextContent(
      item.querySelector(".ranking-title"),
      match.candidate_product?.title || match.candidate_product?.model || productUrl
    );
    const urlNode = item.querySelector(".ranking-url");
    urlNode.href = productUrl;
    setTextContent(urlNode, productUrl);
	    setInnerHtml(
	      item.querySelector(".ranking-metadata"),
	      `
	        <span class="ranking-metric ranking-metric--risk">
          <span class="ranking-metric-label">Risk</span>
          <span class="ranking-metric-value" style="color: ${escapeHtml(
            getRiskColor(match.counterfeit_risk_score)
          )};">
            ${escapeHtml(Number(match.counterfeit_risk_score || 0).toFixed(1))}
          </span>
	        </span>
	        <span class="ranking-metric">
	          <span class="ranking-metric-label">Match</span>
	          <span class="ranking-metric-value">${escapeHtml(Number(match.match_score || 0).toFixed(1))}</span>
	        </span>
          <button type="button" class="case-action ranking-case-action" data-build-case>
            Build Seller Case
          </button>
	      `
	    );
	    setInnerHtml(
	      item.querySelector(".ranking-details-body"),
      `
        <p class="ranking-reason">${escapeHtml(formatReasonText(match.reason || "No reasoning returned."))}</p>
        <div class="ranking-detail-group">
          <strong>Risk reasoning</strong>
          <ul class="ranking-detail-list">
            ${getRiskReasonLines(match)
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join("")}
          </ul>
        </div>
        <div class="ranking-detail-group">
          <strong>Match reasoning</strong>
          <ul class="ranking-detail-list">
            ${getMatchReasonLines(match)
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join("")}
          </ul>
        </div>
        ${
          match.suspicious_signals?.length
            ? `
              <div class="ranking-detail-group">
                <strong>Signals</strong>
                <div class="ranking-detail-chips">
                  ${match.suspicious_signals
                    .map((signal) => `<span class="ranking-chip">${escapeHtml(humanizeFieldName(signal))}</span>`)
                    .join("")}
                </div>
              </div>
            `
            : ""
        }
	        ${
	          match.evidence?.length
	            ? `
	              <div class="ranking-detail-group">
                <strong>Evidence</strong>
                <div class="ranking-evidence-list">
                  ${match.evidence
                    .slice(0, 3)
                    .map(
                      (evidenceItem) => `
                        <div class="ranking-evidence-item">
                          <span class="ranking-evidence-field">${escapeHtml(evidenceItem.field || "Field")}</span>
                          <p>${escapeHtml(evidenceItem.note || "No note returned.")}</p>
                        </div>
                      `
                    )
                    .join("")}
	                </div>
	              </div>
	            `
	            : ""
	        }
	      `
	    );
      configureBuildCaseButton(item.querySelector("[data-build-case]"), report, match);
	    const toggleButton = item.querySelector(".ranking-toggle");
    const isOpen = item.classList.contains("is-open");
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    toggleButton.setAttribute("aria-label", isOpen ? "Hide reasoning" : "Show reasoning");
    item.querySelector(".ranking-details-body").hidden = !isOpen;

    timelineRankingList.appendChild(item);
  });

  existingItems.forEach((node) => node.remove());

  requestAnimationFrame(() => {
    [...timelineRankingList.querySelectorAll(".ranking-item")].forEach((node) => {
      const previousPosition = previousPositions.get(node.dataset.productUrl);
      if (!previousPosition) {
        node.animate(
          [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        return;
      }

      const nextPosition = node.getBoundingClientRect();
      const deltaY = previousPosition.top - nextPosition.top;
      if (deltaY) {
        node.animate(
          [{ transform: `translateY(${deltaY}px)` }, { transform: "translateY(0)" }],
          { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    });
  });
}

function renderTimeline(activeReport) {
  renderSourceStage(activeReport);
  renderSearchStage(activeReport);
  renderCandidateStage(activeReport);
  renderAnalysisStage(activeReport);
  renderRankingStage(activeReport);
}

function formatSourceProduct(product, error) {
  if (error) {
    return `Extraction failed: ${error}`;
  }
  if (!product) {
    return "No source product extracted.";
  }
  return `
    ${product.brand || "Unknown brand"} · ${product.product_name || "Unknown product"}<br />
    SKU: ${product.sku || "n/a"}<br />
    Model: ${product.model || "n/a"}<br />
    Price: ${product.currency || ""} ${product.price || "n/a"}<br />
    Material: ${product.material || "n/a"}<br />
    Features: ${(product.features || []).join(", ") || "n/a"}
  `;
}

function getReportKey(report, index) {
  return `${index}:${report.source_url}`;
}

function createReportCard(reportKey) {
  const reportFragment = reportTemplate.content.cloneNode(true);
  const reportCard = reportFragment.querySelector(".report-card");
  reportCard.dataset.reportKey = reportKey;
  return reportCard;
}

function renderMatches(matchesNode, topMatches, report) {
  const sortedMatches = sortMatchesByCounterfeitRisk(topMatches);
  const matchesFingerprint = JSON.stringify(sortedMatches);
  if (matchesNode.dataset.renderedMatches === matchesFingerprint) {
    return;
  }

  matchesNode.dataset.renderedMatches = matchesFingerprint;
  matchesNode.innerHTML = "";

  if (!sortedMatches || sortedMatches.length === 0) {
    matchesNode.innerHTML = '<p class="empty-state">No ranked matches were returned.</p>';
    return;
  }

  sortedMatches.forEach((match) => {
    const matchFragment = matchTemplate.content.cloneNode(true);
    matchFragment.querySelector(".match-header").innerHTML = `
      <strong>${match.marketplace}</strong><br />
      <a href="${match.product_url}" target="_blank" rel="noreferrer">${match.product_url}</a>
    `;
    matchFragment.querySelector(".score-grid").innerHTML = `
      <div class="score-chip"><strong>Match Score</strong>${match.match_score}</div>
      <div class="score-chip"><strong>Counterfeit Risk</strong>${match.counterfeit_risk_score}</div>
      <div class="score-chip"><strong>Exact Match</strong>${match.is_exact_match ? "Yes" : "No"}</div>
    `;
    matchFragment.querySelector(".reason").textContent = formatReasonText(
      match.reason || "No reasoning returned."
    );
    matchFragment.querySelector(".signals").innerHTML =
      match.suspicious_signals.length > 0
        ? match.suspicious_signals
            .map((signal) => `<span class="signal">${escapeHtml(humanizeFieldName(signal))}</span>`)
            .join("")
        : '<span class="empty-state">No suspicious signals were flagged.</span>';
    matchFragment.querySelector(".evidence-list").innerHTML =
      match.evidence.length > 0
        ? match.evidence
            .map(
              (item) => `
                <div class="evidence-item">
                  <strong>${item.field}</strong> · ${item.note}<br />
                  Source: ${item.source_value ?? "n/a"}<br />
                  Candidate: ${item.candidate_value ?? "n/a"}<br />
                  Confidence: ${item.confidence}
                </div>
              `
            )
            .join("")
        : '<p class="empty-state">No evidence items returned.</p>';
    configureBuildCaseButton(matchFragment.querySelector("[data-build-case]"), report, match);
    matchesNode.appendChild(matchFragment);
  });
}

function createAgentLogItem(taskId) {
  const item = document.createElement("div");
  item.className = "agent-log-item";
  item.dataset.taskId = taskId;

  const header = document.createElement("div");
  header.className = "agent-log-head";
  const name = document.createElement("strong");
  name.className = "agent-log-name";
  const status = document.createElement("span");
  status.className = "agent-log-status";
  header.append(name, document.createTextNode(" · "), status);

  const provider = document.createElement("div");
  provider.className = "agent-log-provider";

  const error = document.createElement("div");
  error.className = "agent-log-error";

  const output = document.createElement("code");
  output.className = "agent-log-output";

  item.append(header, provider, error, output);
  return item;
}

function renderAgentLog(agentLogContent, tasks) {
  const existingItems = new Map(
    [...agentLogContent.querySelectorAll(".agent-log-item")].map((node) => [node.dataset.taskId, node])
  );

  tasks.forEach((task) => {
    let item = existingItems.get(task.task_id);
    if (!item) {
      item = createAgentLogItem(task.task_id);
    } else {
      existingItems.delete(task.task_id);
    }

    setTextContent(item.querySelector(".agent-log-name"), task.agent_name);
    setTextContent(item.querySelector(".agent-log-status"), task.status);

    const providerState = describeProviderState(task);
    const providerNode = item.querySelector(".agent-log-provider");
    setTextContent(providerNode, providerState);
    providerNode.hidden = !providerState;

    const errorNode = item.querySelector(".agent-log-error");
    const errorText = task.error ? `Error: ${task.error}` : "";
    setTextContent(errorNode, errorText);
    errorNode.hidden = !errorText;

    setTextContent(
      item.querySelector(".agent-log-output"),
      JSON.stringify(task.output_payload, null, 2)
    );

    agentLogContent.appendChild(item);
  });

  existingItems.forEach((node) => node.remove());
}

function updateReportCard(reportCard, report) {
  setTextContent(reportCard.querySelector(".report-summary"), report.summary);
  setInnerHtml(
    reportCard.querySelector(".report-source"),
    `
      <strong>Source URL</strong><br />
      ${report.source_url}<br /><br />
      <strong>Extracted Product</strong><br />
      ${formatSourceProduct(report.extracted_source_product, report.error)}
    `
  );

  renderMatches(reportCard.querySelector(".matches"), getRankingSnapshots(report), report);
  renderAgentLog(reportCard.querySelector(".agent-log-content"), report.raw_agent_outputs || []);
}

function renderResults(payload) {
  const visibleReports = (payload.reports || []).filter(
    (report) =>
      (report.raw_agent_outputs || []).length > 0 ||
      Boolean(report.extracted_source_product) ||
      getRankingSnapshots(report).length > 0 ||
      Boolean(report.error)
  );

  if (visibleReports.length === 0) {
    renderEmptyState("No investigation reports are available yet.");
    return;
  }

  const topLevelEmptyState = [...resultsNode.children].find((child) =>
    child.classList.contains("empty-state")
  );
  if (topLevelEmptyState) {
    topLevelEmptyState.remove();
  }

  const existingCards = new Map(
    [...resultsNode.querySelectorAll(".report-card")].map((node) => [node.dataset.reportKey, node])
  );
  const nextKeys = new Set();

  visibleReports.forEach((report, index) => {
    const reportKey = getReportKey(report, index);
    nextKeys.add(reportKey);

    let reportCard = existingCards.get(reportKey);
    if (!reportCard) {
      reportCard = createReportCard(reportKey);
    }

    updateReportCard(reportCard, report);
    resultsNode.appendChild(reportCard);
  });

  existingCards.forEach((node, key) => {
    if (!nextKeys.has(key)) {
      node.remove();
    }
  });
}

function resetCaseWorkspace() {
  latestCasePayload = null;
  currentCaseId = null;
  setCaseStatus("idle");
  if (caseProgressFill) {
    caseProgressFill.style.width = "0%";
  }
  if (caseProgressTrack) {
    caseProgressTrack.setAttribute("aria-valuenow", "0");
  }
  setTextContent(caseTitle, "Seller Enforcement Case");
  setTextContent(
    caseSubtitle,
    "Select a suspicious seller from the investigation results to build a case."
  );
  setTextContent(caseProgressText, "No seller case has been started yet.");
  setInnerHtml(
    caseProfileSummary,
    '<p class="case-muted">Seller profile details will appear here after TinyFish inspects the storefront.</p>'
  );
  setInnerHtml(
    caseSeedSummary,
    '<p class="case-muted">Choose a suspicious listing from the investigation results to seed a seller case.</p>'
  );
  setInnerHtml(
    caseSuspectListings,
    '<p class="case-muted">Suspicious seller listings will populate here after the storefront inventory is analyzed.</p>'
  );
  setInnerHtml(
    caseEvidenceGrid,
    '<p class="case-muted">Evidence objects will appear here after the seller-level synthesis step completes.</p>'
  );
  setInnerHtml(
    caseDraft,
    '<p class="case-muted">The marketplace-facing request draft will appear here after evidence is assembled.</p>'
  );
  setInnerHtml(
    caseActivityLog,
    '<p class="case-muted">Agent activity will stream here while the seller case is being built.</p>'
  );
  if (caseAgentLog) {
    caseAgentLog.innerHTML = "";
  }
  updateCaseGenerateReportButton(null);
}

function updateCaseProgress(payload) {
  const tasks = payload?.raw_agent_outputs || [];
  const completed = tasks.filter((task) => task.status === "completed").length;
  const failed = tasks.some((task) => task.status === "failed");
  const percent =
    payload?.status === "completed"
      ? 100
      : payload?.status === "failed"
        ? Math.max(12, Math.round((completed / Math.max(tasks.length, 1)) * 100))
        : tasks.length > 0
          ? Math.max(8, Math.round((completed / tasks.length) * 100))
          : payload?.status === "queued"
            ? 4
            : 12;

  setCaseStatus(payload?.status || "idle");
  if (caseProgressFill) {
    caseProgressFill.style.width = `${percent}%`;
  }
  if (caseProgressTrack) {
    caseProgressTrack.setAttribute("aria-valuenow", String(percent));
  }
  if (payload?.summary) {
    setTextContent(caseProgressText, payload.summary);
  } else if (failed) {
    setTextContent(caseProgressText, "The seller case failed before the draft could be completed.");
  } else {
    setTextContent(caseProgressText, "Preparing the seller case workflow.");
  }
}

function renderCaseProfile(payload) {
  const profile = payload?.seller_profile;
  if (!profile) {
    setInnerHtml(
      caseProfileSummary,
      '<p class="case-muted">TinyFish has not returned seller profile data yet.</p>'
    );
    return;
  }

  const badges = (profile.badges || [])
    .map((badge) => `<span class="case-tag">${escapeHtml(badge)}</span>`)
    .join("");
  const officialClaims = (profile.official_store_claims || [])
    .map((claim) => `<span class="case-tag">${escapeHtml(claim)}</span>`)
    .join("");
  setInnerHtml(
    caseProfileSummary,
    `
      <div class="case-seed-card">
        <strong>${escapeHtml(profile.seller_name || payload.seller_name || "Unknown seller")}</strong>
        <p>${escapeHtml(profile.storefront_summary || profile.profile_text || "No storefront summary returned yet.")}</p>
        ${profile.seller_url ? `<p><a href="${escapeHtml(profile.seller_url)}" target="_blank" rel="noreferrer">Open storefront</a></p>` : ""}
      </div>
      <div class="case-stat-grid">
        <div class="case-stat"><strong>Marketplace</strong>${escapeHtml(profile.marketplace || payload.marketplace || "Unknown")}</div>
        <div class="case-stat"><strong>Rating</strong>${profile.rating ?? "n/a"}</div>
        <div class="case-stat"><strong>Ratings Count</strong>${profile.rating_count ?? "n/a"}</div>
        <div class="case-stat"><strong>Followers</strong>${profile.follower_count ?? "n/a"}</div>
        <div class="case-stat"><strong>Location</strong>${escapeHtml(profile.location || "n/a")}</div>
        <div class="case-stat"><strong>Joined</strong>${escapeHtml(profile.joined_date || "n/a")}</div>
        <div class="case-stat"><strong>Entry URLs</strong>${(profile.entry_urls || []).length}</div>
        <div class="case-stat"><strong>Storefront Shards</strong>${(profile.storefront_shard_urls || []).length}</div>
      </div>
      ${badges ? `<div class="case-tags">${badges}</div>` : ""}
      ${officialClaims ? `<div class="case-tags">${officialClaims}</div>` : ""}
    `
  );
}

function renderCaseSeed(payload) {
  const selectedListing = payload?.selected_listing;
  if (!selectedListing) {
    setInnerHtml(
      caseSeedSummary,
      `<div class="case-seed-card"><strong>${escapeHtml(payload?.product_url || "Selected listing")}</strong><p>Seed listing details are still being resolved from the investigation results.</p></div>`
    );
    return;
  }

  setInnerHtml(
    caseSeedSummary,
    `
      <div class="case-seed-card">
        <strong>${escapeHtml(selectedListing.candidate_product?.title || selectedListing.product_url)}</strong>
        <p><a href="${escapeHtml(selectedListing.product_url)}" target="_blank" rel="noreferrer">${escapeHtml(selectedListing.product_url)}</a></p>
        <p>${escapeHtml(formatReasonText(selectedListing.reason || "No case seed rationale returned."))}</p>
      </div>
      <div class="case-stat-grid">
        <div class="case-stat"><strong>Marketplace</strong>${escapeHtml(selectedListing.marketplace || "Unknown")}</div>
        <div class="case-stat"><strong>Seller</strong>${escapeHtml(selectedListing.candidate_product?.seller_name || payload?.seller_name || "Unknown")}</div>
        <div class="case-stat"><strong>Risk</strong>${selectedListing.counterfeit_risk_score ?? "n/a"}</div>
        <div class="case-stat"><strong>Match</strong>${selectedListing.match_score ?? "n/a"}</div>
      </div>
    `
  );
}

function renderCaseListings(payload) {
  const listings = payload?.suspect_listings || [];
  const officialMatchesByUrl = Object.fromEntries(
    (payload?.official_product_matches || []).map((item) => [String(item.product_url), item])
  );
  if (listings.length === 0) {
    setInnerHtml(
      caseSuspectListings,
      '<p class="case-muted">No suspect seller listings have been confirmed yet.</p>'
    );
    return;
  }

  setInnerHtml(
    caseSuspectListings,
    listings
      .map(
        (listing, index) => `
          <article class="case-listing-card">
            <div class="case-listing-head">
              <div>
                <strong>#${index + 1} ${escapeHtml(listing.candidate_product?.title || listing.product_url)}</strong>
                <p><a href="${escapeHtml(listing.product_url)}" target="_blank" rel="noreferrer">${escapeHtml(listing.product_url)}</a></p>
              </div>
              <span class="case-pill" data-tone="risk">Risk ${Number(listing.counterfeit_risk_score || 0).toFixed(2)}</span>
            </div>
            <p>${escapeHtml(formatReasonText(listing.reason || "No listing rationale returned."))}</p>
            ${
              officialMatchesByUrl[String(listing.product_url)]?.official_product_url
                ? `<p><strong>Official product:</strong> <a href="${escapeHtml(
                    officialMatchesByUrl[String(listing.product_url)].official_product_url
                  )}" target="_blank" rel="noreferrer">${escapeHtml(
                    officialMatchesByUrl[String(listing.product_url)].official_product_url
                  )}</a></p>`
                : ""
            }
            <div class="case-tags">
              <span class="case-tag">Match ${Number(listing.match_score || 0).toFixed(2)}</span>
              <span class="case-tag">Triage ${Number(listing.triage_priority_score || 0).toFixed(2)}</span>
              <span class="case-tag">Official Match ${Number(listing.comparison_basis_confidence || 0).toFixed(2)}</span>
              ${(listing.suspicious_signals || [])
                .map((signal) => `<span class="case-tag">${escapeHtml(humanizeFieldName(signal))}</span>`)
                .join("")}
            </div>
          </article>
        `
      )
      .join("")
  );
}

function renderCaseEvidence(payload) {
  const evidence = payload?.evidence || [];
  if (evidence.length === 0) {
    setInnerHtml(
      caseEvidenceGrid,
      '<p class="case-muted">No evidence objects are available yet.</p>'
    );
    return;
  }

  setInnerHtml(
    caseEvidenceGrid,
    evidence
      .map(
        (item) => `
          <article class="case-evidence-card">
            <div class="case-evidence-head">
              <div>
                <strong>${escapeHtml(item.title || item.type)}</strong>
                <p>${escapeHtml(item.note || "")}</p>
              </div>
              <span class="case-pill">${Number(item.confidence || 0).toFixed(2)}</span>
            </div>
            ${item.reference_url ? `<p><a href="${escapeHtml(item.reference_url)}" target="_blank" rel="noreferrer">${escapeHtml(item.reference_url)}</a></p>` : ""}
            <div class="case-tags">
              ${item.subject ? `<span class="case-tag">${escapeHtml(item.subject)}</span>` : ""}
              ${(item.supporting_signals || [])
                .map((signal) => `<span class="case-tag">${escapeHtml(humanizeFieldName(signal))}</span>`)
                .join("")}
            </div>
          </article>
        `
      )
      .join("")
  );
}

function renderCaseDraft(payload) {
  const draft = payload?.action_request_draft;
  if (!draft) {
    setInnerHtml(
      caseDraft,
      '<p class="case-muted">The action-request draft is still being prepared.</p>'
    );
    return;
  }

  setInnerHtml(
    caseDraft,
    `
      <div class="case-draft-block">
        <strong>${escapeHtml(draft.case_title || "Seller case draft")}</strong>
        <p>${escapeHtml(draft.summary || "")}</p>
      </div>
      <div class="case-draft-block">
        <strong>Recommended Action</strong>
        <p><span class="case-pill" data-tone="action">${escapeHtml(draft.recommended_action || "manual review")}</span></p>
        <p>${escapeHtml(draft.suspected_violation_type || "")}</p>
      </div>
      <div class="case-draft-block">
        <strong>Reasoning</strong>
        <p>${escapeHtml(draft.reasoning || "")}</p>
      </div>
      <div class="case-draft-block">
        <strong>Marketplace Request</strong>
        <p>${escapeHtml(draft.request_text || "")}</p>
      </div>
      <div class="case-draft-block">
        <strong>Evidence References</strong>
        ${
          (draft.evidence_references || []).length > 0
            ? `<div class="case-tags">${draft.evidence_references
                .map(
                  (reference) =>
                    `<a class="case-tag" href="${escapeHtml(reference)}" target="_blank" rel="noreferrer">${escapeHtml(
                      formatHostname(reference)
                    )}</a>`
                )
                .join("")}</div>`
            : '<p class="case-muted">No evidence references were returned.</p>'
        }
      </div>
    `
  );
}

function renderCaseActivity(payload) {
  const activity = payload?.activity_log || [];
  if (activity.length === 0) {
    setInnerHtml(
      caseActivityLog,
      '<p class="case-muted">No activity has been recorded yet.</p>'
    );
    return;
  }

  setInnerHtml(
    caseActivityLog,
    activity
      .slice(-10)
      .reverse()
      .map(
        (item) => `
          <article class="case-activity-item">
            <div class="case-activity-head">
              <strong>${escapeHtml(item.agent_name || "agent")}</strong>
              <span class="case-pill">${escapeHtml(formatReportDate(item.timestamp))}</span>
            </div>
            <p>${escapeHtml(item.message || "")}</p>
          </article>
        `
      )
      .join("")
  );
}

function renderCaseWorkspace(payload) {
  latestCasePayload = payload;
  selectCase(payload.case_id);
  upsertPastCaseFromCasePayload(payload);
  if (payload.investigation_id) {
    selectInvestigation(payload.investigation_id);
  }
  setTextContent(caseTitle, payload.seller_name || "Seller Enforcement Case");
  setTextContent(
    caseSubtitle,
    `Source product: ${payload.source_product?.product_name || payload.source_url || "Unknown source"}`
  );
  updateCaseProgress(payload);
  renderCaseProfile(payload);
  renderCaseSeed(payload);
  renderCaseListings(payload);
  renderCaseEvidence(payload);
  renderCaseDraft(payload);
  renderCaseActivity(payload);
  if (caseAgentLog) {
    renderAgentLog(caseAgentLog, payload.raw_agent_outputs || []);
  }
  updateCaseGenerateReportButton(payload);
}

async function fetchCase(caseId) {
  try {
    const response = await fetch(`/cases/${caseId}`);
    if (!response.ok) {
      if (response.status === 404) {
        clearPersistedCaseId();
      }
      throw new Error("Unable to refresh the seller case.");
    }

    const payload = await response.json();
    renderCaseWorkspace(payload);
    setPhase("case");

    if (["queued", "running", "delayed"].includes(payload.status)) {
      casePollTimer = window.setTimeout(() => fetchCase(caseId), getCasePollIntervalMs());
    } else if (casePollTimer) {
      window.clearTimeout(casePollTimer);
      casePollTimer = null;
      refreshPastCases();
    } else {
      refreshPastCases();
    }
  } catch (error) {
    if (casePollTimer) {
      window.clearTimeout(casePollTimer);
      casePollTimer = null;
    }
    setCaseStatus("failed");
    setTextContent(
      caseProgressText,
      error instanceof Error ? error.message : "The seller case could not be refreshed."
    );
    updateCaseGenerateReportButton(null);
  }
}

function loadCase(caseId) {
  if (!caseId) {
    return;
  }
  if (casePollTimer) {
    window.clearTimeout(casePollTimer);
    casePollTimer = null;
  }
  previousPhaseBeforeCase = currentPhase === "case" ? "prompt" : currentPhase;
  resetCaseWorkspace();
  selectCase(caseId);
  setPhase("case");
  setCaseStatus("queued");
  setTextContent(caseProgressText, "Loading the saved seller case.");
  fetchCase(caseId);
}

async function createSellerCase(sourceUrl, productUrl) {
  if (!currentInvestigationId) {
    return;
  }

  if (casePollTimer) {
    window.clearTimeout(casePollTimer);
    casePollTimer = null;
  }

  previousPhaseBeforeCase = currentPhase === "case" ? "progress" : currentPhase;
  resetCaseWorkspace();
  setPhase("case");
  setCaseStatus("queued");
  setTextContent(caseProgressText, "Creating the seller case and preparing the storefront research agents.");

  const response = await fetch("/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      investigation_id: currentInvestigationId,
      source_url: sourceUrl,
      product_url: productUrl,
    }),
  });
  if (!response.ok) {
    throw new Error("Unable to create the seller case.");
  }

  const payload = await response.json();
  renderCaseWorkspace(payload);
  await fetchCase(payload.case_id);
}

async function restorePersistedCase() {
  const persistedCaseId = getPersistedCaseId();
  if (!persistedCaseId) {
    return;
  }

  try {
    await fetchCase(persistedCaseId);
  } catch {
    clearPersistedCaseId();
  }
}

async function handleBuildCaseButtonClick(button) {
  button.disabled = true;
  button.textContent = "Building case...";
  try {
    await createSellerCase(button.dataset.sourceUrl, button.dataset.productUrl);
  } catch (error) {
    setPhase("progress");
    setTextContent(
      progressText,
      error instanceof Error ? error.message : "The seller case could not be created."
    );
  } finally {
    button.textContent = "Build Seller Case";
    configureBuildCaseButton(
      button,
      { source_url: button.dataset.sourceUrl },
      {
        product_url: button.dataset.productUrl,
        marketplace: button.dataset.marketplace,
        candidate_product: { seller_name: button.dataset.sellerName },
      }
    );
  }
}

async function fetchInvestigation(investigationId) {
  try {
    const response = await fetch(`/investigation/${investigationId}`);
    if (!response.ok) {
      if (response.status === 404) {
        clearPersistedInvestigationId();
        throw new Error("The saved investigation was not found.");
      }
      throw new Error("Unable to refresh the investigation state.");
    }

    const payload = await response.json();
    latestInvestigationPayload = payload;
    lastSubmittedSourceUrl = payload.reports?.[0]?.source_url || lastSubmittedSourceUrl;
    setPhase("progress");
    selectInvestigation(payload.investigation_id);
    upsertPastRunFromInvestigation(payload);
    setStatus(payload.status);
    renderProgressTracking(payload);
    renderResults(payload);
    updateGenerateReportButton(payload);

    if (["queued", "running", "delayed"].includes(payload.status)) {
      pollTimer = window.setTimeout(
        () => fetchInvestigation(investigationId),
        getInvestigationPollIntervalMs()
      );
    } else if (pollTimer) {
      window.clearTimeout(pollTimer);
      refreshPastRuns();
    }
  } catch (error) {
    if (pollTimer) {
      window.clearTimeout(pollTimer);
    }
    latestInvestigationPayload = null;
    resetReportScene();
    setPhase("progress");
    setStatus("failed");
    const stepStates = Object.fromEntries(progressStepDefinitions.map((step) => [step.key, "failed"]));
    updateProgressUI({
      overview: "Progress unavailable",
      detail: error.message,
      percent: 0,
      stepStates,
    });
    renderTimeline(null);
    renderEmptyState("The investigation state could not be refreshed. Try again in a moment.");
    updateGenerateReportButton(null);
  }
}

async function restorePersistedInvestigation() {
  const persistedInvestigationId = getPersistedInvestigationId();
  if (!persistedInvestigationId) {
    setPhase("prompt");
    return;
  }

  try {
    const response = await fetch(`/investigation/${persistedInvestigationId}`);
    if (!response.ok) {
      throw new Error("The saved investigation was not found.");
    }

    const payload = await response.json();
    if (["queued", "running", "delayed"].includes(payload.status)) {
      currentInvestigationId = persistedInvestigationId;
      setPhase("progress");
      setStatus("queued");
      const queuedStepStates = Object.fromEntries(
        progressStepDefinitions.map((step, index) => [step.key, index === 0 ? "queued" : "pending"])
      );
      updateProgressUI({
        overview: "Restoring previous investigation",
        detail: "Reloading the latest saved investigation state.",
        percent: 4,
        stepStates: queuedStepStates,
      });
      renderTimeline(null);
      renderEmptyState("Restoring the latest saved investigation state.");
      fetchInvestigation(persistedInvestigationId);
      return;
    }

    clearPersistedInvestigationId();
    upsertPastRunFromInvestigation(payload);
    setPhase("prompt");
  } catch {
    clearPersistedInvestigationId();
    setPhase("prompt");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source_urls = parseLines(sourceUrlsInput.value);
  const comparison_sites = parseLines(comparisonSitesInput.value);

  if (source_urls.length === 0) {
    setComposerInvalid(true);
    setStatus("idle");
    setPhase("prompt");
    updateProgressUI({
      overview: "Official product URL required",
      detail: "Add at least one official product page URL to begin.",
      percent: 0,
      stepStates: Object.fromEntries(progressStepDefinitions.map((step) => [step.key, "pending"])),
    });
    renderEmptyState("Add one or more official product page URLs, one per line.");
    sourceUrlsInput.focus();
    return;
  }

  setComposerInvalid(false);
  lastSubmittedSourceUrl = source_urls[0] || "";
  latestInvestigationPayload = null;
  resetReportScene();
  resetCaseWorkspace();
  setHistoryMenuOpen(false);
  setCaseHistoryMenuOpen(false);
  updateGenerateReportButton(null);

  if (pollTimer) {
    window.clearTimeout(pollTimer);
  }
  if (casePollTimer) {
    window.clearTimeout(casePollTimer);
    casePollTimer = null;
  }

  setPhase("progress");
  setStatus("queued");
  const queuedStepStates = Object.fromEntries(
    progressStepDefinitions.map((step, index) => [step.key, index === 0 ? "queued" : "pending"])
  );
  updateProgressUI({
    overview: "Submitting investigation request",
    detail: "Creating the investigation and preparing live progress updates.",
    percent: 4,
    stepStates: queuedStepStates,
  });
  renderTimeline(null);
  renderEmptyState("Starting a live investigation and preparing the first result set.");
  setSubmitting(true);

  try {
    const response = await fetch("/investigate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_urls, comparison_sites }),
    });
    if (!response.ok) {
      throw new Error("Unable to start the investigation.");
    }

    const payload = await response.json();
    await refreshPastRuns();
    loadInvestigation(payload.investigation_id);
  } catch (error) {
    setStatus("failed");
    const stepStates = Object.fromEntries(progressStepDefinitions.map((step) => [step.key, "failed"]));
    updateProgressUI({
      overview: "Investigation failed to start",
      detail: error.message,
      percent: 0,
      stepStates,
    });
    renderTimeline(null);
    renderEmptyState("The investigation could not be started. Check the backend and try again.");
  } finally {
    setSubmitting(false);
  }
});

sourceUrlsInput.addEventListener("input", () => {
  setComposerInvalid(false);
  syncPromptHeight();
});

sourceUrlsInput.addEventListener("focus", () => {
  setComposerInvalid(false);
});

sourceUrlsInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

if (timelineRankingList) {
  timelineRankingList.addEventListener("click", (event) => {
    const toggle = event.target.closest(".ranking-toggle");
    if (!toggle) {
      return;
    }

    const item = toggle.closest(".ranking-item");
    if (!item) {
      return;
    }

    const isOpen = item.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Hide reasoning" : "Show reasoning");

    const detailBody = item.querySelector(".ranking-details-body");
    if (detailBody) {
      detailBody.hidden = !isOpen;
    }
  });
}

if (generateReportButton) {
  generateReportButton.addEventListener("click", async () => {
    if (!latestInvestigationPayload) {
      return;
    }

    previousPhaseBeforeReport = currentPhase;
    reportGenerationInFlight = true;
    updateGenerateReportButton(latestInvestigationPayload);
    setTextContent(progressText, "Generating the evidence dossier PDF from the latest investigation data.");

    try {
      const pdfBlob = buildInvestigationPdf(latestInvestigationPayload);
      presentPdfReport(pdfBlob, latestInvestigationPayload);
      setTextContent(progressText, "Evidence dossier prepared and embedded below.");
    } catch (error) {
      setTextContent(
        progressText,
        error instanceof Error ? error.message : "The report PDF could not be generated."
      );
    } finally {
      reportGenerationInFlight = false;
      updateGenerateReportButton(latestInvestigationPayload);
    }
  });
}

if (caseGenerateReportButton) {
  caseGenerateReportButton.addEventListener("click", async () => {
    if (!latestCasePayload) {
      return;
    }

    previousPhaseBeforeReport = currentPhase;
    caseReportGenerationInFlight = true;
    updateCaseGenerateReportButton(latestCasePayload);
    setTextContent(caseProgressText, "Generating the seller enforcement dossier from the latest case data.");

    try {
      const pdfBlob = buildSellerCasePdf(latestCasePayload);
      presentSellerCasePdfReport(pdfBlob, latestCasePayload);
      setTextContent(caseProgressText, "Seller enforcement dossier prepared and embedded below.");
    } catch (error) {
      setTextContent(
        caseProgressText,
        error instanceof Error ? error.message : "The seller case PDF could not be generated."
      );
    } finally {
      caseReportGenerationInFlight = false;
      updateCaseGenerateReportButton(latestCasePayload);
    }
  });
}

if (reportBackButton) {
  reportBackButton.addEventListener("click", () => {
    setPhase(previousPhaseBeforeReport || "progress");
  });
}

if (reportOpenButton) {
  reportOpenButton.addEventListener("click", () => {
    if (!currentReportPdfUrl) {
      return;
    }
    window.open(currentReportPdfUrl, "_blank", "noopener");
  });
}

if (newInvestigationButton) {
  newInvestigationButton.addEventListener("click", () => {
    startNewInvestigation();
  });
}

if (historyButton) {
  historyButton.addEventListener("click", () => {
    const isOpen = historyButton.getAttribute("aria-expanded") === "true";
    setCaseHistoryMenuOpen(false);
    setHistoryMenuOpen(!isOpen);
  });
}

if (caseHistoryButton) {
  caseHistoryButton.addEventListener("click", () => {
    const isOpen = caseHistoryButton.getAttribute("aria-expanded") === "true";
    setHistoryMenuOpen(false);
    setCaseHistoryMenuOpen(!isOpen);
  });
}

if (caseBackButton) {
  caseBackButton.addEventListener("click", () => {
    setPhase(previousPhaseBeforeCase || "progress");
  });
}

if (pastRunsNode) {
  pastRunsNode.addEventListener("click", (event) => {
    const button = event.target.closest(".past-run-item");
    if (!button) {
      return;
    }
    setHistoryMenuOpen(false);
    loadInvestigation(button.dataset.investigationId);
  });
}

if (pastCasesNode) {
  pastCasesNode.addEventListener("click", (event) => {
    const button = event.target.closest(".past-run-item");
    if (!button) {
      return;
    }
    setCaseHistoryMenuOpen(false);
    loadCase(button.dataset.caseId);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (
    historyButton &&
    historyDropdown &&
    !historyButton.contains(target) &&
    !historyDropdown.contains(target)
  ) {
    setHistoryMenuOpen(false);
  }

  if (
    caseHistoryButton &&
    caseHistoryDropdown &&
    !caseHistoryButton.contains(target) &&
    !caseHistoryDropdown.contains(target)
  ) {
    setCaseHistoryMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setHistoryMenuOpen(false);
    setCaseHistoryMenuOpen(false);
  }
});

if (resultsNode) {
  resultsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-build-case]");
    if (!button) {
      return;
    }

    await handleBuildCaseButtonClick(button);
  });
}

if (timelineRankingList) {
  timelineRankingList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-build-case]");
    if (!button) {
      return;
    }

    await handleBuildCaseButtonClick(button);
  });
}

setStatus("idle");
setCaseStatus("idle");
resetProgressTracking();
renderEmptyState("Add official product page URLs to compare them against live marketplace listings.");
syncPromptHeight();
updateGenerateReportButton(null);
resetReportScene();
resetCaseWorkspace();

currentInvestigationId = getPersistedInvestigationId();
refreshPastRuns();
refreshPastCases();
restorePersistedInvestigation().finally(() => {
  restorePersistedCase();
});

window.addEventListener("beforeunload", () => {
  revokeCurrentReportPdfUrl();
});

fetch("/config")
  .then((response) => response.json())
  .then((config) => {
    appConfig = config;
    const stores = (config.ecommerce_store_urls || []).join(", ");
    const lines = [];
    if (config.brand_landing_page_url) {
      lines.push(`Brand home: ${config.brand_landing_page_url}`);
    }
    if (stores) {
      lines.push(`Default marketplace targets: ${stores}`);
      if (comparisonSitesInput && !comparisonSitesInput.value.trim()) {
        comparisonSitesInput.value = (config.ecommerce_store_urls || []).join("\n");
      }
    }
    if (configNote) {
      configNote.textContent =
        lines.join(" • ") ||
        "Environment defaults are not loaded yet. You can still enter source pages and marketplace targets manually.";
    }
  })
  .catch(() => {
    appConfig = null;
    if (configNote) {
      configNote.textContent =
        "Environment defaults could not be loaded. Manual inputs still work.";
    }
  });
