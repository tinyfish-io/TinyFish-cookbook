/**
 * TinyFish Data Collector
 * Uses the TinyFish web agent API to extract structured audit data from a URL.
 * This replaces the manual Puppeteer DOM scraping phase with an AI-powered
 * web agent that can handle dynamic content, SPAs, and complex page structures.
 *
 * TinyFish SSE stream events:
 *   STARTED   → run_id confirmed
 *   PROGRESS  → intermediate step updates
 *   COMPLETE  → final result with extracted data
 *   HEARTBEAT → keep-alive ping
 */

'use strict';

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';
const TINYFISH_TIMEOUT_MS = 120_000; // 2 minutes max

/**
 * The structured extraction goal sent to TinyFish.
 * Designed to collect all signals needed by the 6 WebAudit categories.
 */
const AUDIT_EXTRACTION_GOAL = `
You are a web security and performance auditor. Visit this page and extract the following data as structured JSON:

1. HTTP response headers (all headers as key-value pairs)
2. Page meta tags: title, description, og:title, og:description, og:image, og:url, twitter:card, canonical URL, robots meta, viewport meta
3. All cookies: name, value (first 20 chars), httpOnly flag, secure flag, sameSite attribute, domain, path
4. External scripts: src URLs, whether they have integrity attribute, whether they are async/defer
5. Inline scripts: count of inline <script> tags, whether any use eval() or document.write
6. External stylesheets: count and src URLs
7. Images without alt text: count
8. Form elements: count of forms, whether they use HTTPS action, whether they have CSRF tokens (hidden inputs)
9. Links: count of external links (target="_blank"), whether they have rel="noopener noreferrer"
10. Console errors: any JavaScript errors detected on page load
11. Page performance hints: approximate page size, number of resources, whether gzip/brotli is indicated
12. Security signals: any Content-Security-Policy meta tags, X-Frame-Options meta equiv, any mixed content (HTTP resources on HTTPS page)
13. GDPR/Privacy signals: cookie consent banners (look for common consent manager text/elements), privacy policy link, terms of service link
14. Third-party trackers: identify any known analytics/tracking scripts (Google Analytics, Facebook Pixel, HotJar, etc.)
15. LLM/AI signals: any AI chatbot widgets, LLM API endpoints in scripts, AI-generated content disclaimers, model output disclosure text
16. Page title and main heading (h1)
17. HTTP status code of the page
18. Whether the page redirected from HTTP to HTTPS
19. TLS/SSL: whether the site uses HTTPS

Return ONLY a valid JSON object with these fields. No markdown, no explanation.
`;

/**
 * Parse SSE stream text into an array of event objects.
 * @param {string} text - Raw SSE response text
 * @returns {Array<{type: string, data: object}>}
 */
function parseSSEStream(text) {
  const events = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const json = JSON.parse(line.slice(6));
        events.push(json);
      } catch {
        // skip malformed lines
      }
    }
  }
  return events;
}

/**
 * Call TinyFish API with SSE streaming and wait for the COMPLETE event.
 * @param {string} url - Target URL to audit
 * @param {string} apiKey - TinyFish API key
 * @returns {Promise<object>} - The result from the COMPLETE event
 */
async function callTinyFishSSE(url, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TINYFISH_TIMEOUT_MS);

  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        url,
        goal: AUDIT_EXTRACTION_GOAL,
        browser_profile: 'lite',
        proxy_config: { enabled: false },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`TinyFish API error ${response.status}: ${errText}`);
    }

    // Read the full SSE stream as text
    const text = await response.text();
    const events = parseSSEStream(text);

    // Find the COMPLETE event
    const completeEvent = events.find(e => e.type === 'COMPLETE');
    if (!completeEvent) {
      throw new Error('TinyFish stream ended without a COMPLETE event');
    }

    if (completeEvent.status !== 'COMPLETED') {
      throw new Error(`TinyFish run failed with status: ${completeEvent.status}`);
    }

    return completeEvent.result;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse the TinyFish result (which may be a string or object) into a structured object.
 * @param {string|object} result - Raw TinyFish result
 * @returns {object} - Parsed audit data
 */
function parseTinyFishResult(result) {
  if (!result) return {};

  // Result may be a string (JSON), an object, or have a nested output field
  let raw = result;
  if (typeof raw === 'string') {
    // Strip markdown code fences if present
    raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      raw = JSON.parse(raw);
    } catch {
      // If it's not valid JSON, return empty object
      return {};
    }
  }

  // TinyFish may wrap the result in an output or data field
  if (raw && typeof raw === 'object') {
    if (raw.output) raw = raw.output;
    else if (raw.data) raw = raw.data;
    else if (raw.result) raw = raw.result;
  }

  if (typeof raw === 'string') {
    raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    try { raw = JSON.parse(raw); } catch { return {}; }
  }

  return raw || {};
}

/**
 * Normalize TinyFish extracted data into the WebAudit pageData format
 * expected by all 6 audit modules.
 *
 * @param {object} extracted - Parsed TinyFish result
 * @param {string} url - Original URL
 * @returns {object} - WebAudit-compatible pageData object
 */
function normalizeToPageData(extracted, url) {
  const headers = extracted.httpResponseHeaders || extracted.headers || {};
  const cookies = extracted.cookies || [];
  const scripts = extracted.externalScripts || extracted.scripts || [];
  const inlineScripts = extracted.inlineScripts || {};
  const metaTags = extracted.metaTags || extracted.meta || {};
  const forms = extracted.formElements || extracted.forms || {};
  const links = extracted.links || {};
  const images = extracted.imagesWithoutAlt || extracted.images || {};
  const performance = extracted.pagePerformanceHints || extracted.performance || {};
  const security = extracted.securitySignals || extracted.security || {};
  const gdpr = extracted.gdprPrivacySignals || extracted.privacy || {};
  const trackers = extracted.thirdPartyTrackers || extracted.trackers || [];
  const llmSignals = extracted.llmAiSignals || extracted.llm || {};
  const consoleErrors = extracted.consoleErrors || [];

  // Normalize headers to lowercase keys
  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  return {
    url,
    finalUrl: extracted.finalUrl || url,
    statusCode: extracted.httpStatusCode || extracted.statusCode || 200,
    redirectedToHttps: extracted.redirectedFromHttpToHttps || extracted.httpsRedirect || false,
    usesHttps: extracted.tlsSsl?.usesHttps ?? extracted.usesHttps ?? url.startsWith('https'),

    // Headers (normalized lowercase)
    headers: normalizedHeaders,

    // Page info
    pageInfo: {
      title: metaTags.title || extracted.pageTitle || '',
      description: metaTags.description || '',
      h1: extracted.mainHeading || extracted.h1 || '',
      canonical: metaTags.canonical || '',
      robots: metaTags.robots || '',
      viewport: metaTags.viewport || '',
      ogTitle: metaTags['og:title'] || metaTags.ogTitle || '',
      ogDescription: metaTags['og:description'] || metaTags.ogDescription || '',
      ogImage: metaTags['og:image'] || metaTags.ogImage || '',
      ogUrl: metaTags['og:url'] || metaTags.ogUrl || '',
      twitterCard: metaTags['twitter:card'] || metaTags.twitterCard || '',
    },

    // Cookies
    cookies: Array.isArray(cookies) ? cookies.map(c => ({
      name: c.name || '',
      httpOnly: c.httpOnly || c.http_only || false,
      secure: c.secure || false,
      sameSite: c.sameSite || c.same_site || '',
      domain: c.domain || '',
      path: c.path || '/',
    })) : [],

    // Scripts
    scripts: Array.isArray(scripts) ? scripts.map(s => ({
      src: s.src || s.url || '',
      hasIntegrity: s.hasIntegrity || s.integrity || false,
      isAsync: s.isAsync || s.async || false,
      isDefer: s.isDefer || s.defer || false,
    })) : [],

    inlineScriptCount: inlineScripts.count || (Array.isArray(inlineScripts) ? inlineScripts.length : 0),
    hasEval: inlineScripts.usesEval || inlineScripts.hasEval || false,
    hasDocumentWrite: inlineScripts.usesDocumentWrite || inlineScripts.hasDocumentWrite || false,

    // Images
    imagesWithoutAlt: images.count ?? (typeof images === 'number' ? images : 0),

    // Forms
    formCount: forms.count ?? (Array.isArray(forms) ? forms.length : 0),
    formsWithHttpAction: forms.formsWithHttpAction || forms.httpAction || 0,
    formsWithCsrfToken: forms.formsWithCsrfToken || forms.csrfTokens || 0,

    // Links
    externalLinksWithoutNoopener: links.externalLinksWithoutNoopener || links.withoutNoopener || 0,
    externalLinkCount: links.externalLinkCount || links.count || 0,

    // Console errors
    consoleErrors: Array.isArray(consoleErrors) ? consoleErrors : [],
    consoleErrorCount: Array.isArray(consoleErrors) ? consoleErrors.length : 0,

    // Performance
    pageSize: performance.approximatePageSize || performance.pageSize || 0,
    resourceCount: performance.numberOfResources || performance.resourceCount || 0,
    usesCompression: performance.usesGzipOrBrotli || performance.compression || false,

    // Security signals
    hasCspMeta: security.contentSecurityPolicyMeta || security.cspMeta || false,
    hasMixedContent: security.mixedContent || security.hasMixedContent || false,

    // GDPR / Privacy
    hasCookieConsent: gdpr.cookieConsentBanner || gdpr.hasConsent || false,
    hasPrivacyPolicy: gdpr.privacyPolicyLink || gdpr.hasPrivacyPolicy || false,
    hasTermsOfService: gdpr.termsOfServiceLink || gdpr.hasTerms || false,

    // Third-party trackers
    trackers: Array.isArray(trackers) ? trackers : (typeof trackers === 'object' ? Object.keys(trackers) : []),
    trackerCount: Array.isArray(trackers) ? trackers.length : (typeof trackers === 'object' ? Object.keys(trackers).length : 0),

    // LLM/AI signals
    hasAiChatbot: llmSignals.aiChatbotWidget || llmSignals.hasChatbot || false,
    hasLlmApiEndpoint: llmSignals.llmApiEndpoints || llmSignals.hasLlmEndpoint || false,
    hasAiDisclaimer: llmSignals.aiGeneratedContentDisclaimer || llmSignals.hasDisclaimer || false,
    hasModelOutputDisclosure: llmSignals.modelOutputDisclosureText || llmSignals.hasDisclosure || false,

    // Raw TinyFish data for advanced checks
    _tinyfishRaw: extracted,
    _collectedBy: 'tinyfish',
  };
}

/**
 * Main entry point: collect audit data for a URL using TinyFish.
 *
 * @param {string} url - Target URL
 * @param {string} apiKey - TinyFish API key
 * @returns {Promise<object>} - WebAudit-compatible pageData
 */
async function collectWithTinyFish(url, apiKey) {
  if (!apiKey) throw new Error('TinyFish API key is required');

  const rawResult = await callTinyFishSSE(url, apiKey);
  const extracted = parseTinyFishResult(rawResult);
  return normalizeToPageData(extracted, url);
}

module.exports = { collectWithTinyFish, normalizeToPageData, parseTinyFishResult };
