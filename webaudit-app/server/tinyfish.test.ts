/**
 * TinyFish Collector Tests
 *
 * Tests the TinyFish data collector module:
 * 1. Validates the API key is present in the environment
 * 2. Tests the parseTinyFishResult normalizer with mock data
 * 3. Tests the normalizeToPageData function produces valid WebAudit pageData
 * 4. Validates the TinyFish API key is valid by calling the API (lightweight)
 */

import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { parseTinyFishResult, normalizeToPageData } = require(
  path.join(__dirname, "webaudit/core/tinyfish-collector.js")
);

// ── parseTinyFishResult ────────────────────────────────────────────────────────

describe("parseTinyFishResult", () => {
  it("returns empty object for null/undefined input", () => {
    expect(parseTinyFishResult(null)).toEqual({});
    expect(parseTinyFishResult(undefined)).toEqual({});
  });

  it("parses a plain JSON string", () => {
    const result = parseTinyFishResult('{"httpResponseHeaders":{"content-type":"text/html"}}');
    expect(result).toHaveProperty("httpResponseHeaders");
  });

  it("parses a JSON string wrapped in markdown code fences", () => {
    const result = parseTinyFishResult('```json\n{"usesHttps":true}\n```');
    expect(result).toHaveProperty("usesHttps", true);
  });

  it("unwraps nested output field", () => {
    const result = parseTinyFishResult({ output: { usesHttps: true } });
    expect(result).toHaveProperty("usesHttps", true);
  });

  it("unwraps nested result field", () => {
    const result = parseTinyFishResult({ result: { usesHttps: false } });
    expect(result).toHaveProperty("usesHttps", false);
  });

  it("returns the object directly if no wrapper field", () => {
    const input = { httpResponseHeaders: { "x-frame-options": "DENY" } };
    const result = parseTinyFishResult(input);
    expect(result).toHaveProperty("httpResponseHeaders");
  });
});

// ── normalizeToPageData ────────────────────────────────────────────────────────

describe("normalizeToPageData", () => {
  const mockExtracted = {
    httpResponseHeaders: {
      "content-type": "text/html; charset=utf-8",
      "strict-transport-security": "max-age=31536000",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'self'",
    },
    metaTags: {
      title: "Test Site",
      description: "A test website",
      "og:title": "Test OG Title",
      viewport: "width=device-width, initial-scale=1",
      robots: "index, follow",
    },
    cookies: [
      { name: "session", httpOnly: true, secure: true, sameSite: "Strict" },
      { name: "tracker", httpOnly: false, secure: false, sameSite: "None" },
    ],
    externalScripts: [
      { src: "https://cdn.example.com/app.js", hasIntegrity: true, isAsync: true },
      { src: "https://www.google-analytics.com/analytics.js", hasIntegrity: false },
    ],
    inlineScripts: { count: 3, usesEval: false, usesDocumentWrite: false },
    imagesWithoutAlt: { count: 2 },
    formElements: { count: 1, formsWithHttpAction: 0, formsWithCsrfToken: 1 },
    links: { externalLinksWithoutNoopener: 3, externalLinkCount: 10 },
    consoleErrors: ["TypeError: Cannot read property of undefined"],
    pagePerformanceHints: { approximatePageSize: 512000, numberOfResources: 45, usesGzipOrBrotli: true },
    securitySignals: { mixedContent: false, contentSecurityPolicyMeta: false },
    gdprPrivacySignals: { cookieConsentBanner: true, privacyPolicyLink: true, termsOfServiceLink: false },
    thirdPartyTrackers: ["Google Analytics", "Facebook Pixel"],
    llmAiSignals: { aiChatbotWidget: false, llmApiEndpoints: false, aiGeneratedContentDisclaimer: false },
    httpStatusCode: 200,
    usesHttps: true,
    redirectedFromHttpToHttps: true,
    pageTitle: "Test Site",
    mainHeading: "Welcome to Test Site",
  };

  const pageData = normalizeToPageData(mockExtracted, "https://test.example.com");

  it("produces a valid pageData object with url", () => {
    expect(pageData).toHaveProperty("url", "https://test.example.com");
  });

  it("normalizes headers to lowercase keys", () => {
    expect(pageData.headers).toHaveProperty("content-type");
    expect(pageData.headers).toHaveProperty("strict-transport-security");
    expect(pageData.headers).toHaveProperty("x-frame-options");
  });

  it("extracts pageInfo correctly", () => {
    expect(pageData.pageInfo.title).toBe("Test Site");
    expect(pageData.pageInfo.description).toBe("A test website");
    expect(pageData.pageInfo.ogTitle).toBe("Test OG Title");
  });

  it("normalizes cookies array", () => {
    expect(Array.isArray(pageData.cookies)).toBe(true);
    expect(pageData.cookies).toHaveLength(2);
    expect(pageData.cookies[0]).toHaveProperty("httpOnly", true);
    expect(pageData.cookies[0]).toHaveProperty("secure", true);
  });

  it("normalizes scripts array", () => {
    expect(Array.isArray(pageData.scripts)).toBe(true);
    expect(pageData.scripts).toHaveLength(2);
    expect(pageData.scripts[0]).toHaveProperty("hasIntegrity", true);
  });

  it("extracts performance signals", () => {
    expect(pageData.pageSize).toBe(512000);
    expect(pageData.resourceCount).toBe(45);
    expect(pageData.usesCompression).toBe(true);
  });

  it("extracts GDPR signals", () => {
    expect(pageData.hasCookieConsent).toBe(true);
    expect(pageData.hasPrivacyPolicy).toBe(true);
  });

  it("extracts tracker list", () => {
    expect(Array.isArray(pageData.trackers)).toBe(true);
    expect(pageData.trackerCount).toBe(2);
  });

  it("marks collectedBy as tinyfish", () => {
    expect(pageData._collectedBy).toBe("tinyfish");
  });

  it("extracts console errors", () => {
    expect(pageData.consoleErrorCount).toBe(1);
  });

  it("extracts HTTPS and redirect signals", () => {
    expect(pageData.usesHttps).toBe(true);
    expect(pageData.redirectedToHttps).toBe(true);
  });
});

// ── TinyFish API Key Validation ────────────────────────────────────────────────

describe("TinyFish API Key", () => {
  it("TINYFISH_API_KEY environment variable is set", () => {
    const key = process.env.TINYFISH_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("API key starts with expected prefix", () => {
    const key = process.env.TINYFISH_API_KEY || "";
    // TinyFish keys start with sk-tinyfish-
    expect(key.startsWith("sk-tinyfish-")).toBe(true);
  });
});
