import assert from "node:assert/strict";
import test from "node:test";
import { computeLlmoScore } from "@/lib/llmo-scoring";
import type { LlmoSignals } from "@/lib/llmo-types";

function makeSignals(overrides?: Partial<LlmoSignals>): LlmoSignals {
  return {
    url: "https://example.com",
    structuredData: {
      hasJsonLd: true,
      types: ["Organization", "WebSite", "Article"],
      hasOrganization: true,
      hasWebSite: true,
      hasArticle: true,
      hasProduct: false,
      hasFaqPage: false,
    },
    extractability: {
      hasH1: true,
      h1Count: 1,
      headingLevels: [1, 2, 3],
      hasSkippedHeadingLevels: false,
      paragraphCount: 6,
      factStatementCount: 8,
    },
    authority: {
      hasAuthor: true,
      hasPublishedTime: true,
      hasModifiedTime: true,
      hasCanonical: true,
      hasOrganizationPublisher: true,
    },
    machineReadability: {
      hasRobotsTxt: true,
      hasSitemapXml: true,
      hasLlmsTxt: true,
    },
    ...overrides,
  };
}

test("computeLlmoScore returns a full score for strong signals", () => {
  const result = computeLlmoScore({
    coverageScore: 100,
    signals: makeSignals(),
  });
  assert.equal(result.overallLlmoScore, 100);
  assert.equal(result.llmoFindings.length, 0);
});

test("computeLlmoScore returns findings for weak signals", () => {
  const result = computeLlmoScore({
    coverageScore: 20,
    signals: makeSignals({
      structuredData: {
        hasJsonLd: false,
        types: [],
        hasOrganization: false,
        hasWebSite: false,
        hasArticle: false,
        hasProduct: false,
        hasFaqPage: false,
      },
      authority: {
        hasAuthor: false,
        hasPublishedTime: false,
        hasModifiedTime: false,
        hasCanonical: false,
        hasOrganizationPublisher: false,
      },
      machineReadability: {
        hasRobotsTxt: false,
        hasSitemapXml: false,
        hasLlmsTxt: false,
      },
    }),
  });

  assert.ok(result.overallLlmoScore < 50);
  assert.ok(result.llmoFindings.length >= 2);
});
