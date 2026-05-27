import { toNum, toText } from "./formatting";

function normalizeConfidence(value) {
  const score = toNum(value?.overall, 0);
  const level = ["high", "medium", "low"].includes(value?.level) ? value.level : score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  return { overall: score, level };
}

export function normalizeReport(results) {
  const fallback = {
    target: { name: "Target", url: "unknown", logo: "?" },
    scannedAt: new Date().toISOString(),
    platformsScanned: [],
    infraCost: {
      monthlyEstimate: { low: 0, mid: 0, high: 0 },
      perUserEstimate: { low: 0, mid: 0, high: 0 },
      revenueEstimate: 0,
      grossMargin: { low: 0, mid: 0, high: 0 },
      breakdown: [],
      signals: [],
      evidenceSources: [],
      confidence: { overall: 0, level: "low" },
      validationWarnings: [],
    },
    buildCost: {
      totalEstimate: { low: 0, mid: 0, high: 0 },
      timeEstimate: { low: 0, mid: 0, high: 0 },
      teamSize: { min: 0, optimal: 0, max: 0 },
      breakdown: [],
      techStack: [],
      evidenceSources: [],
      confidence: { overall: 0, level: "low" },
      validationWarnings: [],
    },
    buyerCost: {
      plans: [],
      tcoComparison: [],
      competitorComparison: [],
      evidenceSources: [],
      confidence: { overall: 0, level: "low" },
      validationWarnings: [],
    },
    executiveSummary: null,
    negotiation: null,
    competitorAnalysis: null,
    riskProfile: {
      overallRiskLevel: "medium",
      securityScore: 0,
      complianceBadges: [],
      findings: [],
      trackerSummary: { total: 0, categories: {} },
      recommendations: [],
    },
    provenance: {
      infra: { evidenceSources: [], extractedAt: null },
      build: { evidenceSources: [], extractedAt: null },
      buyer: { evidenceSources: [], extractedAt: null },
      risk: { evidenceSources: [], extractedAt: null },
      competitors: { evidenceSources: [], extractedAt: null },
    },
    quality: {
      partialData: false,
      degradedPillars: [],
      scannerErrors: { infra: null, build: null, buyer: null, risk: null, competitors: null },
      modelErrors: { infra: null, build: null, buyer: null, risk: null, competitors: null },
      modelWarnings: { infra: [], build: [], buyer: [], risk: [], competitors: [] },
      anomalies: [],
      completenessScore: 100,
      qualityMeta: {
        pillarCoverage: {
          infra: { tasksSucceeded: 0, tasksExpected: 0 },
          build: { tasksSucceeded: 0, tasksExpected: 0 },
          buyer: { tasksSucceeded: 0, tasksExpected: 0 },
          risk: { tasksSucceeded: 0, tasksExpected: 0 },
          competitors: { tasksSucceeded: 0, tasksExpected: 0 },
        },
        sourceCoverage: {
          infra: { sourceFamilies: [], sourceCount: 0, expectedSources: 0 },
          build: { sourceFamilies: [], sourceCount: 0, expectedSources: 0 },
          buyer: { sourceFamilies: [], sourceCount: 0, expectedSources: 0 },
          risk: { sourceFamilies: [], sourceCount: 0, expectedSources: 0 },
          competitors: { sourceFamilies: [], sourceCount: 0, expectedSources: 0 },
        },
        dataFreshness: {
          infra: { extractedAt: null, freshness: "unknown" },
          build: { extractedAt: null, freshness: "unknown" },
          buyer: { extractedAt: null, freshness: "unknown" },
          risk: { extractedAt: null, freshness: "unknown" },
          competitors: { extractedAt: null, freshness: "unknown" },
        },
        crossChecks: [],
        confidenceScore: { infra: 0, build: 0, buyer: 0, risk: 0, competitors: 0, global: 0, level: "low" },
        perPillar: {
          infra: { score: 0, level: "low", scoreComponents: { coverageScore: 0, reliabilityScore: 0, warningCount: 0, scannerFailed: false, modelFailed: false } },
          build: { score: 0, level: "low", scoreComponents: { coverageScore: 0, reliabilityScore: 0, warningCount: 0, scannerFailed: false, modelFailed: false } },
          buyer: { score: 0, level: "low", scoreComponents: { coverageScore: 0, reliabilityScore: 0, warningCount: 0, scannerFailed: false, modelFailed: false } },
          risk: { score: 0, level: "low", scoreComponents: { coverageScore: 0, reliabilityScore: 0, warningCount: 0, scannerFailed: false, modelFailed: false } },
          competitors: { score: 0, level: "low", scoreComponents: { coverageScore: 0, reliabilityScore: 0, warningCount: 0, scannerFailed: false, modelFailed: false } },
        },
      },
    },
  };
  if (!results) return fallback;

  return {
    target: {
      name: toText(results?.target?.name, "Target"),
      url: toText(results?.target?.url, "unknown"),
      logo: toText(results?.target?.logo, "?"),
    },
    scannedAt: results?.scannedAt || fallback.scannedAt,
    platformsScanned: Array.isArray(results?.platformsScanned) ? results.platformsScanned : [],
    infraCost: {
      monthlyEstimate: {
        low: toNum(results?.infraCost?.monthlyEstimate?.low),
        mid: toNum(results?.infraCost?.monthlyEstimate?.mid),
        high: toNum(results?.infraCost?.monthlyEstimate?.high),
      },
      perUserEstimate: {
        low: toNum(results?.infraCost?.perUserEstimate?.low),
        mid: toNum(results?.infraCost?.perUserEstimate?.mid),
        high: toNum(results?.infraCost?.perUserEstimate?.high),
      },
      revenueEstimate: toNum(results?.infraCost?.revenueEstimate),
      grossMargin: {
        low: toNum(results?.infraCost?.grossMargin?.low),
        mid: toNum(results?.infraCost?.grossMargin?.mid),
        high: toNum(results?.infraCost?.grossMargin?.high),
      },
      breakdown: Array.isArray(results?.infraCost?.breakdown)
        ? results.infraCost.breakdown.map((item) => ({
            category: toText(item?.category, "Unknown category"),
            estimate: toText(item?.estimate, "Unknown"),
            confidence: toText(item?.confidence, "low"),
            evidence: toText(item?.evidence, "No evidence available."),
            pct: toNum(item?.pct),
          }))
        : [],
      signals: Array.isArray(results?.infraCost?.signals)
        ? results.infraCost.signals.map((item) => ({
            icon: toText(item?.icon, "•"),
            text: toText(item?.text, "No signal available"),
          }))
        : [],
      evidenceSources: Array.isArray(results?.infraCost?.evidenceSources) ? results.infraCost.evidenceSources.map((x) => toText(x)) : [],
      confidence: normalizeConfidence(results?.infraCost?.confidence),
      validationWarnings: Array.isArray(results?.infraCost?.validationWarnings) ? results.infraCost.validationWarnings.map((x) => toText(x)) : [],
    },
    buildCost: {
      totalEstimate: {
        low: toNum(results?.buildCost?.totalEstimate?.low),
        mid: toNum(results?.buildCost?.totalEstimate?.mid),
        high: toNum(results?.buildCost?.totalEstimate?.high),
      },
      timeEstimate: {
        low: toNum(results?.buildCost?.timeEstimate?.low),
        mid: toNum(results?.buildCost?.timeEstimate?.mid),
        high: toNum(results?.buildCost?.timeEstimate?.high),
      },
      teamSize: {
        min: toNum(results?.buildCost?.teamSize?.min),
        optimal: toNum(results?.buildCost?.teamSize?.optimal),
        max: toNum(results?.buildCost?.teamSize?.max),
      },
      breakdown: Array.isArray(results?.buildCost?.breakdown)
        ? results.buildCost.breakdown.map((item) => ({
            module: toText(item?.module, "Unknown module"),
            effort: toText(item?.effort, "Unknown"),
            cost: toText(item?.cost, "Unknown"),
            complexity: toText(item?.complexity, "medium"),
            notes: toText(item?.notes, "No implementation notes available."),
          }))
        : [],
      techStack: Array.isArray(results?.buildCost?.techStack)
        ? results.buildCost.techStack.map((item) => ({
            layer: toText(item?.layer, "Layer"),
            tech: toText(item?.tech, "Unknown"),
            detected: Boolean(item?.detected),
            confidence: toText(item?.confidence, "low"),
          }))
        : [],
      evidenceSources: Array.isArray(results?.buildCost?.evidenceSources) ? results.buildCost.evidenceSources.map((x) => toText(x)) : [],
      confidence: normalizeConfidence(results?.buildCost?.confidence),
      validationWarnings: Array.isArray(results?.buildCost?.validationWarnings) ? results.buildCost.validationWarnings.map((x) => toText(x)) : [],
    },
    buyerCost: {
      plans: Array.isArray(results?.buyerCost?.plans)
        ? results.buyerCost.plans.map((plan) => ({
            name: toText(plan?.name, "Unknown"),
            listed: toText(plan?.listed, "Unknown"),
            actualMonthly: toText(plan?.actualMonthly, "Unknown"),
            gotchas: Array.isArray(plan?.gotchas) ? plan.gotchas.map((g) => toText(g, "Unknown")) : [],
            hiddenCosts: Array.isArray(plan?.hiddenCosts)
              ? plan.hiddenCosts.map((hc) => ({
                  item: toText(hc?.item, "Unknown"),
                  cost: toText(hc?.cost, "Unknown"),
                  note: toText(hc?.note, "No note"),
                }))
              : [],
          }))
        : [],
      tcoComparison: Array.isArray(results?.buyerCost?.tcoComparison)
        ? results.buyerCost.tcoComparison.map((row) => ({
            scenario: toText(row?.scenario, "Unknown"),
            monthlyListed: toText(row?.monthlyListed, "Unknown"),
            monthlyActual: toText(row?.monthlyActual, "Unknown"),
            annualDelta: toText(row?.annualDelta, "Unknown"),
            note: toText(row?.note, "No note"),
          }))
        : [],
      competitorComparison: Array.isArray(results?.buyerCost?.competitorComparison)
        ? results.buyerCost.competitorComparison.map((row) => ({
            name: toText(row?.name, "Unknown"),
            cost: toText(row?.cost, "Unknown"),
            features: toText(row?.features, "N/A"),
          }))
        : [],
      evidenceSources: Array.isArray(results?.buyerCost?.evidenceSources) ? results.buyerCost.evidenceSources.map((x) => toText(x)) : [],
      confidence: normalizeConfidence(results?.buyerCost?.confidence),
      validationWarnings: Array.isArray(results?.buyerCost?.validationWarnings) ? results.buyerCost.validationWarnings.map((x) => toText(x)) : [],
    },
    executiveSummary: results?.executiveSummary
      ? {
          summary: toText(results.executiveSummary.summary, ""),
          keyFindings: Array.isArray(results.executiveSummary.keyFindings) ? results.executiveSummary.keyFindings.map((x) => toText(x)) : [],
          recommendations: Array.isArray(results.executiveSummary.recommendations)
            ? results.executiveSummary.recommendations.map((r) => ({
                title: toText(r?.title, "Recommendation"),
                detail: toText(r?.detail, ""),
                priority: toText(r?.priority, "medium"),
              }))
            : [],
          verdictLabel: toText(results.executiveSummary.verdictLabel, "Insufficient Data"),
        }
      : null,
    negotiation: results?.negotiation
      ? {
          leverageFactors: Array.isArray(results.negotiation.leverageFactors)
            ? results.negotiation.leverageFactors.map((f) => ({
                factor: toText(f?.factor, ""),
                explanation: toText(f?.explanation, ""),
              }))
            : [],
          talkingPoints: Array.isArray(results.negotiation.talkingPoints) ? results.negotiation.talkingPoints.map((x) => toText(x)) : [],
          counterOffers: Array.isArray(results.negotiation.counterOffers)
            ? results.negotiation.counterOffers.map((c) => ({
                plan: toText(c?.plan, "Unknown"),
                currentPrice: toText(c?.currentPrice, "Unknown"),
                suggestedTarget: toText(c?.suggestedTarget, "Unknown"),
                rationale: toText(c?.rationale, ""),
              }))
            : [],
          riskWarnings: Array.isArray(results.negotiation.riskWarnings) ? results.negotiation.riskWarnings.map((x) => toText(x)) : [],
        }
      : null,
    riskProfile: {
      overallRiskLevel: toText(results?.riskProfile?.overallRiskLevel, "medium"),
      securityScore: toNum(results?.riskProfile?.securityScore, 0),
      complianceBadges: Array.isArray(results?.riskProfile?.complianceBadges)
        ? results.riskProfile.complianceBadges.map((b) => ({
            name: toText(b?.name, "Unknown"),
            status: toText(b?.status, "missing"),
          }))
        : [],
      findings: Array.isArray(results?.riskProfile?.findings)
        ? results.riskProfile.findings.map((f) => ({
            category: toText(f?.category, "General"),
            severity: toText(f?.severity, "info"),
            detail: toText(f?.detail, ""),
          }))
        : [],
      trackerSummary: {
        total: toNum(results?.riskProfile?.trackerSummary?.total, 0),
        categories: results?.riskProfile?.trackerSummary?.categories && typeof results.riskProfile.trackerSummary.categories === "object"
          ? results.riskProfile.trackerSummary.categories
          : {},
      },
      recommendations: Array.isArray(results?.riskProfile?.recommendations) ? results.riskProfile.recommendations.map((x) => toText(x)) : [],
    },
    competitorAnalysis: results?.competitorAnalysis
      ? {
          landscape: toText(results.competitorAnalysis.landscape, ""),
          competitors: Array.isArray(results.competitorAnalysis.competitors)
            ? results.competitorAnalysis.competitors.map((c) => ({
                name: toText(c?.name, "Unknown"),
                url: toText(c?.url, ""),
                description: toText(c?.description, ""),
                startingPrice: toText(c?.startingPrice, "Unknown"),
                positioning: {
                  priceLevel: toNum(c?.positioning?.priceLevel, 3),
                  featureRichness: toNum(c?.positioning?.featureRichness, 3),
                },
                prosVsTarget: Array.isArray(c?.prosVsTarget) ? c.prosVsTarget.map((x) => toText(x)) : [],
                consVsTarget: Array.isArray(c?.consVsTarget) ? c.consVsTarget.map((x) => toText(x)) : [],
              }))
            : [],
          targetPositioning: {
            priceLevel: toNum(results.competitorAnalysis.targetPositioning?.priceLevel, 3),
            featureRichness: toNum(results.competitorAnalysis.targetPositioning?.featureRichness, 3),
          },
          verdict: toText(results.competitorAnalysis.verdict, ""),
        }
      : null,
    provenance: {
      infra: {
        evidenceSources: Array.isArray(results?.provenance?.infra?.evidenceSources) ? results.provenance.infra.evidenceSources.map((x) => toText(x)) : [],
        extractedAt: results?.provenance?.infra?.extractedAt || null,
      },
      build: {
        evidenceSources: Array.isArray(results?.provenance?.build?.evidenceSources) ? results.provenance.build.evidenceSources.map((x) => toText(x)) : [],
        extractedAt: results?.provenance?.build?.extractedAt || null,
      },
      buyer: {
        evidenceSources: Array.isArray(results?.provenance?.buyer?.evidenceSources) ? results.provenance.buyer.evidenceSources.map((x) => toText(x)) : [],
        extractedAt: results?.provenance?.buyer?.extractedAt || null,
      },
      risk: {
        evidenceSources: Array.isArray(results?.provenance?.risk?.evidenceSources) ? results.provenance.risk.evidenceSources.map((x) => toText(x)) : [],
        extractedAt: results?.provenance?.risk?.extractedAt || null,
      },
      competitors: {
        evidenceSources: Array.isArray(results?.provenance?.competitors?.evidenceSources) ? results.provenance.competitors.evidenceSources.map((x) => toText(x)) : [],
        extractedAt: results?.provenance?.competitors?.extractedAt || null,
      },
    },
    quality: {
      partialData: Boolean(results?.quality?.partialData),
      degradedPillars: Array.isArray(results?.quality?.degradedPillars) ? results.quality.degradedPillars : [],
      scannerErrors: {
        infra: results?.quality?.scannerErrors?.infra || null,
        build: results?.quality?.scannerErrors?.build || null,
        buyer: results?.quality?.scannerErrors?.buyer || null,
        risk: results?.quality?.scannerErrors?.risk || null,
        competitors: results?.quality?.scannerErrors?.competitors || null,
      },
      modelErrors: {
        infra: results?.quality?.modelErrors?.infra || null,
        build: results?.quality?.modelErrors?.build || null,
        buyer: results?.quality?.modelErrors?.buyer || null,
        risk: results?.quality?.modelErrors?.risk || null,
        competitors: results?.quality?.modelErrors?.competitors || null,
      },
      modelWarnings: {
        infra: Array.isArray(results?.quality?.modelWarnings?.infra) ? results.quality.modelWarnings.infra : [],
        build: Array.isArray(results?.quality?.modelWarnings?.build) ? results.quality.modelWarnings.build : [],
        buyer: Array.isArray(results?.quality?.modelWarnings?.buyer) ? results.quality.modelWarnings.buyer : [],
        risk: Array.isArray(results?.quality?.modelWarnings?.risk) ? results.quality.modelWarnings.risk : [],
        competitors: Array.isArray(results?.quality?.modelWarnings?.competitors) ? results.quality.modelWarnings.competitors : [],
      },
      anomalies: Array.isArray(results?.quality?.anomalies) ? results.quality.anomalies : [],
      completenessScore: toNum(results?.quality?.completenessScore, 100),
      qualityMeta: {
        pillarCoverage: {
          infra: {
            tasksSucceeded: toNum(results?.quality?.qualityMeta?.pillarCoverage?.infra?.tasksSucceeded),
            tasksExpected: toNum(results?.quality?.qualityMeta?.pillarCoverage?.infra?.tasksExpected),
          },
          build: {
            tasksSucceeded: toNum(results?.quality?.qualityMeta?.pillarCoverage?.build?.tasksSucceeded),
            tasksExpected: toNum(results?.quality?.qualityMeta?.pillarCoverage?.build?.tasksExpected),
          },
          buyer: {
            tasksSucceeded: toNum(results?.quality?.qualityMeta?.pillarCoverage?.buyer?.tasksSucceeded),
            tasksExpected: toNum(results?.quality?.qualityMeta?.pillarCoverage?.buyer?.tasksExpected),
          },
          risk: {
            tasksSucceeded: toNum(results?.quality?.qualityMeta?.pillarCoverage?.risk?.tasksSucceeded),
            tasksExpected: toNum(results?.quality?.qualityMeta?.pillarCoverage?.risk?.tasksExpected),
          },
          competitors: {
            tasksSucceeded: toNum(results?.quality?.qualityMeta?.pillarCoverage?.competitors?.tasksSucceeded),
            tasksExpected: toNum(results?.quality?.qualityMeta?.pillarCoverage?.competitors?.tasksExpected),
          },
        },
        sourceCoverage: {
          infra: {
            sourceFamilies: Array.isArray(results?.quality?.qualityMeta?.sourceCoverage?.infra?.sourceFamilies)
              ? results.quality.qualityMeta.sourceCoverage.infra.sourceFamilies
              : [],
            sourceCount: toNum(results?.quality?.qualityMeta?.sourceCoverage?.infra?.sourceCount),
            expectedSources: toNum(results?.quality?.qualityMeta?.sourceCoverage?.infra?.expectedSources),
          },
          build: {
            sourceFamilies: Array.isArray(results?.quality?.qualityMeta?.sourceCoverage?.build?.sourceFamilies)
              ? results.quality.qualityMeta.sourceCoverage.build.sourceFamilies
              : [],
            sourceCount: toNum(results?.quality?.qualityMeta?.sourceCoverage?.build?.sourceCount),
            expectedSources: toNum(results?.quality?.qualityMeta?.sourceCoverage?.build?.expectedSources),
          },
          buyer: {
            sourceFamilies: Array.isArray(results?.quality?.qualityMeta?.sourceCoverage?.buyer?.sourceFamilies)
              ? results.quality.qualityMeta.sourceCoverage.buyer.sourceFamilies
              : [],
            sourceCount: toNum(results?.quality?.qualityMeta?.sourceCoverage?.buyer?.sourceCount),
            expectedSources: toNum(results?.quality?.qualityMeta?.sourceCoverage?.buyer?.expectedSources),
          },
          risk: {
            sourceFamilies: Array.isArray(results?.quality?.qualityMeta?.sourceCoverage?.risk?.sourceFamilies)
              ? results.quality.qualityMeta.sourceCoverage.risk.sourceFamilies
              : [],
            sourceCount: toNum(results?.quality?.qualityMeta?.sourceCoverage?.risk?.sourceCount),
            expectedSources: toNum(results?.quality?.qualityMeta?.sourceCoverage?.risk?.expectedSources),
          },
          competitors: {
            sourceFamilies: Array.isArray(results?.quality?.qualityMeta?.sourceCoverage?.competitors?.sourceFamilies)
              ? results.quality.qualityMeta.sourceCoverage.competitors.sourceFamilies
              : [],
            sourceCount: toNum(results?.quality?.qualityMeta?.sourceCoverage?.competitors?.sourceCount),
            expectedSources: toNum(results?.quality?.qualityMeta?.sourceCoverage?.competitors?.expectedSources),
          },
        },
        dataFreshness: {
          infra: {
            extractedAt: results?.quality?.qualityMeta?.dataFreshness?.infra?.extractedAt || null,
            freshness: toText(results?.quality?.qualityMeta?.dataFreshness?.infra?.freshness, "unknown"),
          },
          build: {
            extractedAt: results?.quality?.qualityMeta?.dataFreshness?.build?.extractedAt || null,
            freshness: toText(results?.quality?.qualityMeta?.dataFreshness?.build?.freshness, "unknown"),
          },
          buyer: {
            extractedAt: results?.quality?.qualityMeta?.dataFreshness?.buyer?.extractedAt || null,
            freshness: toText(results?.quality?.qualityMeta?.dataFreshness?.buyer?.freshness, "unknown"),
          },
          risk: {
            extractedAt: results?.quality?.qualityMeta?.dataFreshness?.risk?.extractedAt || null,
            freshness: toText(results?.quality?.qualityMeta?.dataFreshness?.risk?.freshness, "unknown"),
          },
          competitors: {
            extractedAt: results?.quality?.qualityMeta?.dataFreshness?.competitors?.extractedAt || null,
            freshness: toText(results?.quality?.qualityMeta?.dataFreshness?.competitors?.freshness, "unknown"),
          },
        },
        crossChecks: Array.isArray(results?.quality?.qualityMeta?.crossChecks) ? results.quality.qualityMeta.crossChecks : [],
        confidenceScore: {
          infra: toNum(results?.quality?.qualityMeta?.confidenceScore?.infra),
          build: toNum(results?.quality?.qualityMeta?.confidenceScore?.build),
          buyer: toNum(results?.quality?.qualityMeta?.confidenceScore?.buyer),
          risk: toNum(results?.quality?.qualityMeta?.confidenceScore?.risk),
          competitors: toNum(results?.quality?.qualityMeta?.confidenceScore?.competitors),
          global: toNum(results?.quality?.qualityMeta?.confidenceScore?.global),
          level: toText(results?.quality?.qualityMeta?.confidenceScore?.level, "low"),
        },
        perPillar: {
          infra: {
            score: toNum(results?.quality?.qualityMeta?.perPillar?.infra?.score),
            level: toText(results?.quality?.qualityMeta?.perPillar?.infra?.level, "low"),
            scoreComponents: {
              coverageScore: toNum(results?.quality?.qualityMeta?.perPillar?.infra?.scoreComponents?.coverageScore),
              reliabilityScore: toNum(results?.quality?.qualityMeta?.perPillar?.infra?.scoreComponents?.reliabilityScore),
              warningCount: toNum(results?.quality?.qualityMeta?.perPillar?.infra?.scoreComponents?.warningCount),
              scannerFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.infra?.scoreComponents?.scannerFailed),
              modelFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.infra?.scoreComponents?.modelFailed),
            },
          },
          build: {
            score: toNum(results?.quality?.qualityMeta?.perPillar?.build?.score),
            level: toText(results?.quality?.qualityMeta?.perPillar?.build?.level, "low"),
            scoreComponents: {
              coverageScore: toNum(results?.quality?.qualityMeta?.perPillar?.build?.scoreComponents?.coverageScore),
              reliabilityScore: toNum(results?.quality?.qualityMeta?.perPillar?.build?.scoreComponents?.reliabilityScore),
              warningCount: toNum(results?.quality?.qualityMeta?.perPillar?.build?.scoreComponents?.warningCount),
              scannerFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.build?.scoreComponents?.scannerFailed),
              modelFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.build?.scoreComponents?.modelFailed),
            },
          },
          buyer: {
            score: toNum(results?.quality?.qualityMeta?.perPillar?.buyer?.score),
            level: toText(results?.quality?.qualityMeta?.perPillar?.buyer?.level, "low"),
            scoreComponents: {
              coverageScore: toNum(results?.quality?.qualityMeta?.perPillar?.buyer?.scoreComponents?.coverageScore),
              reliabilityScore: toNum(results?.quality?.qualityMeta?.perPillar?.buyer?.scoreComponents?.reliabilityScore),
              warningCount: toNum(results?.quality?.qualityMeta?.perPillar?.buyer?.scoreComponents?.warningCount),
              scannerFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.buyer?.scoreComponents?.scannerFailed),
              modelFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.buyer?.scoreComponents?.modelFailed),
            },
          },
          risk: {
            score: toNum(results?.quality?.qualityMeta?.perPillar?.risk?.score),
            level: toText(results?.quality?.qualityMeta?.perPillar?.risk?.level, "low"),
            scoreComponents: {
              coverageScore: toNum(results?.quality?.qualityMeta?.perPillar?.risk?.scoreComponents?.coverageScore),
              reliabilityScore: toNum(results?.quality?.qualityMeta?.perPillar?.risk?.scoreComponents?.reliabilityScore),
              warningCount: toNum(results?.quality?.qualityMeta?.perPillar?.risk?.scoreComponents?.warningCount),
              scannerFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.risk?.scoreComponents?.scannerFailed),
              modelFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.risk?.scoreComponents?.modelFailed),
            },
          },
          competitors: {
            score: toNum(results?.quality?.qualityMeta?.perPillar?.competitors?.score),
            level: toText(results?.quality?.qualityMeta?.perPillar?.competitors?.level, "low"),
            scoreComponents: {
              coverageScore: toNum(results?.quality?.qualityMeta?.perPillar?.competitors?.scoreComponents?.coverageScore),
              reliabilityScore: toNum(results?.quality?.qualityMeta?.perPillar?.competitors?.scoreComponents?.reliabilityScore),
              warningCount: toNum(results?.quality?.qualityMeta?.perPillar?.competitors?.scoreComponents?.warningCount),
              scannerFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.competitors?.scoreComponents?.scannerFailed),
              modelFailed: Boolean(results?.quality?.qualityMeta?.perPillar?.competitors?.scoreComponents?.modelFailed),
            },
          },
        },
      },
    },
  };
}
