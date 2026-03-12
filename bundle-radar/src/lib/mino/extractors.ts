import { runAndParse } from './client';

/**
 * Extract client-side JavaScript bundle intelligence.
 * Optimized for TinyFish as screen-viewing agent: read DOM, run JS in page to check globals, scroll to trigger lazy load.
 */
export async function extractBundleIntelligence(url: string) {
  return runAndParse<{
    scripts: { src: string; size?: string; isModule?: boolean; isAsync?: boolean; isDefer?: boolean }[];
    globalVariables: string[];
    frameworkSignals: string[];
    metaTags: { name: string; content: string }[];
    generatorMeta: string | null;
    linkPreloads: { href: string; as: string }[];
    inlineScriptSnippets: string[];
  }>({
    url,
    goal: `You are a smart agent viewing this page. You can read the DOM, page source, and run JavaScript in the page. Do the following in order:

STEP 1 — Wait for the page to load (at least 3 seconds).
STEP 2 — Scroll slowly to the bottom of the page to trigger any lazy-loaded scripts, then wait 2 seconds. This helps capture frameworks like Next.js that load chunks on scroll.
STEP 3 — From the current DOM and page source, extract:

1. scripts: Every <script> tag. For each: src URL (if present), type="module", async, defer. For inline scripts (no src), capture the first 250 characters of content. Include scripts that were added dynamically after load.
2. globalVariables: If you can execute JavaScript in the page context, check the window object and list which of these exist (report the key name only): __NEXT_DATA__, __NUXT__, __GATSBY, __remixContext, __SVELTE_KIT__, __VUE_SSR_CONTEXT__, __REDUX_DEVTOOLS_EXTENSION__, __APOLLO_STATE__, __RELAY_STORE__, React, angular, Vue, jQuery, $, webpackChunk, __webpack_modules__, __vite__, __SENTRY__, DD_RUM, LogRocket, FS, analytics, gtag, fbq, mixpanel, amplitude, heap, posthog, plausible, Intercom, drift, HubSpotConversations, Stripe, PayPal, LaunchDarkly, statsig, split, optimizely, firebase, supabase, auth0, clerk. If you cannot run JS, leave as empty array.
3. frameworkSignals: From the DOM, list any of these you find: data-reactroot, data-react-helmet, ng-version, data-v-*, __sveltekit, _next, __next, id="__next", class containing "next".
4. metaTags: All <meta name="..." content="..."> with name and content.
5. generatorMeta: The content of <meta name="generator"> if present, else null.
6. linkPreloads: Every <link rel="preload"> and <link rel="modulepreload"> with href and as.
7. inlineScriptSnippets: First 300 chars of each inline <script> body, up to 10 scripts.

Return valid JSON with these exact keys.`,
    browser_profile: 'stealth',
  });
}

/**
 * Extract page-visible resource and URL signals.
 * Optimized for screen-viewing agent: DOM + source only; scroll first to get lazy-loaded resources.
 */
export async function extractNetworkIntelligence(url: string) {
  return runAndParse<{
    apiRequests: { url: string; method: string; type: string }[];
    thirdPartyRequests: { domain: string; paths: string[]; category: string }[];
    websocketUrls: string[];
    responseHeaders: Record<string, string>;
    totalRequests: number;
    jsRequests: { url: string; size?: string }[];
    cssRequests: { url: string }[];
    fontRequests: { url: string }[];
    imageRequests: number;
    serviceWorkerUrl: string | null;
    prefetchLinks: string[];
  }>({
    url,
    goal: `You are viewing the page like a user (no DevTools/Network tab). You can read the DOM and page source.

STEP 1 — Wait for the page to load (at least 3 seconds).
STEP 2 — Scroll to the bottom of the page to trigger lazy-loaded resources, wait 2 seconds, then capture.

STEP 3 — From the DOM and page source, extract:

1. jsRequests: Every <script src="..."> URL. Include dynamically added script tags. List each unique URL.
2. cssRequests: Every <link rel="stylesheet" href="..."> URL.
3. fontRequests: Every font URL from <link> (woff, woff2, ttf, otf).
4. prefetchLinks: Every <link rel="prefetch"> and <link rel="modulepreload"> href.
5. thirdPartyRequests: From all URLs above, group by hostname (e.g. cdn.jsdelivr.net, googletagmanager.com). For each domain list the path(s) and set category to one of: analytics, cdn, api, fonts, widget, monitoring, other.
6. apiRequests: Only URLs that look like API calls (e.g. /api/, /graphql, /v1/, REST-style paths) that you find in the page source, inline scripts, or data attributes. Add method "GET" if unknown.
7. websocketUrls: Any ws:// or wss:// URL found in page source or inline script content.
8. responseHeaders: Only if your environment gives you the main document response headers — then include server, x-powered-by, x-vercel-id, cf-ray, content-security-policy, strict-transport-security. Otherwise {}.
9. totalRequests: Count of unique URLs from scripts + styles + fonts + images (from img src and link href).
10. imageRequests: Count of <img> tags with src, or image URLs in link href.
11. serviceWorkerUrl: navigator.serviceWorker.controller or registration URL if visible in page source; else null.

Return valid JSON. Use empty array or null for anything you cannot observe.`,
    browser_profile: 'stealth',
  });
}

/**
 * Extract infrastructure and deployment signals.
 * Uses response headers if available; otherwise infers from script/link URLs and DOM.
 */
export async function extractInfraSignals(url: string) {
  return runAndParse<{
    platform: string | null;
    platformEvidence: string[];
    cdn: string | null;
    cdnEvidence: string[];
    serverHeader: string | null;
    poweredBy: string | null;
    deploymentId: string | null;
    edgeHeaders: Record<string, string>;
    dnsInfo: string | null;
    htmlAttributes: Record<string, string>;
    bodyClasses: string[];
    dataAttributes: string[];
  }>({
    url,
    goal: `You are viewing the page (no DevTools). Infer infrastructure from what you can see.

If you can read the main document's HTTP response headers, use them: server, x-powered-by, x-vercel-id, x-nf-request-id, cf-ray, x-amz-cf-id, via. If you cannot read headers, infer only from the page:

1. platform: From script src and link href URLs and path patterns: _next/ or vercel in URL → Vercel; netlify in URL or netlify-identity → Netlify; cf-ray in any visible header or Cloudflare in URL → Cloudflare; aws, cloudfront, x-amz in URL → AWS; heroku, fly.io, railway, render in URL or comments → that platform. Else null.
2. platformEvidence: List what you used (e.g. "script src contains _next/static", "header x-vercel-id").
3. cdn: From URLs: cdnjs.cloudflare.com, jsdelivr, unpkg, googleapis → infer CDN name. Or from headers if available (via, x-cache, cf-ray).
4. cdnEvidence: What you used to infer CDN.
5. serverHeader: Only if you have the Server response header; else null.
6. poweredBy: Only if you have X-Powered-By; else null.
7. deploymentId: From HTML comments or data attributes (e.g. build id) if visible; else null.
8. edgeHeaders: Any edge-related headers you can read; else {}.
9. dnsInfo: null unless visible somewhere.
10. htmlAttributes: All attributes on <html>.
11. bodyClasses: All class names on <body>.
12. dataAttributes: All data-* attributes on html and body.

Return valid JSON.`,
    browser_profile: 'stealth',
  });
}

/**
 * Extract feature flags, analytics, and runtime config from what the agent can see.
 */
export async function extractRuntimeConfig(url: string) {
  return runAndParse<{
    featureFlags: { provider: string; evidence: string }[];
    abTesting: { provider: string; evidence: string }[];
    envVariables: string[];
    configObjects: { key: string; snippet: string }[];
    errorTrackingDsn: string[];
    analyticsIds: { provider: string; id: string }[];
    chatWidgets: string[];
    consentManagement: string | null;
  }>({
    url,
    goal: `You can read the DOM, page source, and inline scripts. If you can run JavaScript in the page, you may check window.*. Extract:

1. featureFlags: From script src URLs and inline script content, detect: LaunchDarkly (launchdarkly, ld-client), Statsig (statsig), Split (splitio), Optimizely (optimizely). If you can read window, check for ldclient, statsig, split, optimizely. For each found, set provider name and evidence (e.g. "script src contains statsig").
2. abTesting: Same way — Optimizely, VWO (vwo), AB Tasty (abtasty), Google Optimize. Evidence = script URL or global.
3. envVariables: From inline script text only, find variable names (not values) matching process.env., import.meta.env., NEXT_PUBLIC_, VITE_, REACT_APP_, GATSBY_.
4. configObjects: If you can read window, report keys like __CONFIG__, __ENV__, __APP_DATA__ and first 100 chars of stringified value. Else from inline scripts if visible.
5. errorTrackingDsn: In inline scripts or script content you can read, find URLs like *.sentry.io, *.ingest.sentry.io, bugsnag, rollbar. Report the URL or "found in inline script".
6. analyticsIds: From script src (e.g. googletagmanager.com → GA) and inline content: G-, UA-, GT- (GA), fbq, mixpanel, amplitude, segment, posthog, heap. Report provider and id if visible.
7. chatWidgets: From script src and window: Intercom, Drift, Crisp, Zendesk, HubSpot (hubspot, hsq), Tidio, LiveChat. Evidence = script URL or global.
8. consentManagement: From script src: OneTrust, Cookiebot, CookieYes, Osano, TrustArc, Didomi. Else null.

Return valid JSON. Only include what you can actually see or read from the page.`,
    browser_profile: 'stealth',
  });
}

/**
 * Extract security signals from headers (if visible) and from the page (integrity, mixed content, secrets in source).
 */
export async function extractSecuritySignals(url: string) {
  return runAndParse<{
    csp: string | null;
    hsts: boolean;
    xFrameOptions: string | null;
    xContentType: string | null;
    sourceMapsAvailable: boolean;
    sourceMapsUrls: string[];
    exposedSecrets: { type: string; location: string; partial: string }[];
    subresourceIntegrity: boolean;
    mixedContent: boolean;
    corsHeaders: string | null;
  }>({
    url,
    goal: `You can read the page source and DOM. If your environment exposes the main document's response headers, use them. Otherwise infer from the page only.

FROM RESPONSE HEADERS (if you have them): csp (Content-Security-Policy), hsts (Strict-Transport-Security present?), xFrameOptions (X-Frame-Options), xContentType (X-Content-Type-Options), corsHeaders (Access-Control-Allow-Origin). If you do not have headers, set csp/xFrameOptions/xContentType/corsHeaders to null and hsts to false.

FROM THE PAGE (always do):
5. sourceMapsAvailable: Take the first 3 main JS bundle URLs from the page (script src). For each, try to fetch [url].map (e.g. if script is https://example.com/main.js, fetch https://example.com/main.js.map). If any return 200 or you get script/content back, set true.
6. sourceMapsUrls: List any .map URLs that were accessible.
7. exposedSecrets: Scan the text of all inline <script> blocks. Look for: AWS key patterns (AKIA followed by alphanumeric), strings like "key_", "sk_", "pk_", "api_key", "secret". Report type, "inline script", and first 8 characters only. Do not report false positives from variable names.
8. subresourceIntegrity: true if any <script> or <link> tag has an integrity= attribute; else false.
9. mixedContent: true if the page is HTTPS and any script/link/img src uses http://; else false.

Return valid JSON.`,
    browser_profile: 'stealth',
  });
}
