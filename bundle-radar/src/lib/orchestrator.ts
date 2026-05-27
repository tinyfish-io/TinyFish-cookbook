import {
  ScanRequest,
  ScanResult,
  ScanProgress,
  Detection,
  NetworkAnalysis,
  PerformanceSignals,
  SecuritySignals,
  InfraProfile,
  ApiEndpoint,
} from '@/types';
import {
  extractBundleIntelligence,
  extractNetworkIntelligence,
  extractInfraSignals,
  extractRuntimeConfig,
  extractSecuritySignals,
} from '@/lib/mino';
import { runDetection } from '@/lib/detection/signatures';
import {
  generateTechStackSummary,
  generateArchitectureDiagram,
  generateCompetitiveInsights,
} from '@/lib/analyzers/synthesis';

/** Safely coerce a value to an array. LLM results sometimes return objects or strings instead of arrays. */
function asArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val;
  return [];
}

const EMPTY_BUNDLE = {
  scripts: [] as { src: string }[],
  globalVariables: [] as string[],
  frameworkSignals: [] as string[],
  metaTags: [] as { name: string; content: string }[],
  generatorMeta: null as string | null,
  linkPreloads: [] as { href: string; as: string }[],
  inlineScriptSnippets: [] as string[],
};

const EMPTY_NETWORK = {
  apiRequests: [] as { url: string; method: string; type: string }[],
  thirdPartyRequests: [] as { domain: string; paths: string[]; category: string }[],
  websocketUrls: [] as string[],
  responseHeaders: {} as Record<string, string>,
  totalRequests: 0,
  jsRequests: [] as { url: string; size?: string }[],
  cssRequests: [] as { url: string }[],
  fontRequests: [] as { url: string }[],
  imageRequests: 0,
  serviceWorkerUrl: null as string | null,
  prefetchLinks: [] as string[],
};

const EMPTY_INFRA = {
  platform: null as string | null,
  platformEvidence: [] as string[],
  cdn: null as string | null,
  cdnEvidence: [] as string[],
  serverHeader: null as string | null,
  poweredBy: null as string | null,
  deploymentId: null as string | null,
  edgeHeaders: {} as Record<string, string>,
  dnsInfo: null as string | null,
  htmlAttributes: {} as Record<string, string>,
  bodyClasses: [] as string[],
  dataAttributes: [] as string[],
};

const EMPTY_RUNTIME = {
  featureFlags: [] as { provider: string; evidence: string }[],
  abTesting: [] as { provider: string; evidence: string }[],
  envVariables: [] as string[],
  configObjects: [] as { key: string; snippet: string }[],
  errorTrackingDsn: [] as string[],
  analyticsIds: [] as { provider: string; id: string }[],
  chatWidgets: [] as string[],
  consentManagement: null as string | null,
};

const EMPTY_SECURITY = {
  csp: null as string | null,
  hsts: false,
  xFrameOptions: null as string | null,
  xContentType: null as string | null,
  sourceMapsAvailable: false,
  sourceMapsUrls: [] as string[],
  exposedSecrets: [] as { type: string; location: string; partial: string }[],
  subresourceIntegrity: false,
  mixedContent: false,
  corsHeaders: null as string | null,
};

export async function runScan(
  request: ScanRequest,
  onProgress?: (p: ScanProgress) => void
): Promise<ScanResult> {
  const startTime = Date.now();
  const url = request.url; // Already normalized by the route handler
  const failedPhases: string[] = [];
  const warnings: string[] = [];

  // ── Phases 1-5: TinyFish extraction (all parallel via async API) ─
  // Uses the async submit + poll pattern so all 5 phases run concurrently
  // on TinyFish's side. No batching needed — submissions are instant.
  onProgress?.({ stage: 'extracting', detail: 'Extracting page signals (5 passes)...', progress: 10 });

  const [bundleResult, networkResult, infraResult, runtimeResult, securityResult] =
    await Promise.allSettled([
      extractBundleIntelligence(url),
      extractNetworkIntelligence(url),
      extractInfraSignals(url),
      extractRuntimeConfig(url),
      extractSecuritySignals(url),
    ]);

  // Unpack results with fallbacks
  const bundleData = bundleResult.status === 'fulfilled' ? bundleResult.value : EMPTY_BUNDLE;
  if (bundleResult.status === 'rejected') {
    failedPhases.push('bundle');
    warnings.push(`Bundle extraction failed: ${bundleResult.reason instanceof Error ? bundleResult.reason.message : String(bundleResult.reason)}`);
  }

  const networkData = networkResult.status === 'fulfilled' ? networkResult.value : EMPTY_NETWORK;
  if (networkResult.status === 'rejected') {
    failedPhases.push('network');
    warnings.push(`Network extraction failed: ${networkResult.reason instanceof Error ? networkResult.reason.message : String(networkResult.reason)}`);
  }

  const infraData = infraResult.status === 'fulfilled' ? infraResult.value : EMPTY_INFRA;
  if (infraResult.status === 'rejected') {
    failedPhases.push('infra');
    warnings.push(`Infrastructure extraction failed: ${infraResult.reason instanceof Error ? infraResult.reason.message : String(infraResult.reason)}`);
  }

  const runtimeData = runtimeResult.status === 'fulfilled' ? runtimeResult.value : EMPTY_RUNTIME;
  if (runtimeResult.status === 'rejected') {
    failedPhases.push('runtime');
    warnings.push(`Runtime config extraction failed: ${runtimeResult.reason instanceof Error ? runtimeResult.reason.message : String(runtimeResult.reason)}`);
  }

  const securityData = securityResult.status === 'fulfilled' ? securityResult.value : EMPTY_SECURITY;
  if (securityResult.status === 'rejected') {
    failedPhases.push('security');
    warnings.push(`Security extraction failed: ${securityResult.reason instanceof Error ? securityResult.reason.message : String(securityResult.reason)}`);
  }

  if (failedPhases.length > 0) {
    warnings.unshift(`Partial report: ${failedPhases.join(', ')} phase(s) failed. Results may be incomplete.`);
  }

  // ── Phase 6: Detection Engine ────────────────────────────
  onProgress?.({ stage: 'analyzing', detail: 'Running signature detection...', progress: 60 });

  // Safely coerce all LLM-returned array fields
  const scripts = asArray<{ src: string }>(bundleData.scripts);
  const jsRequests = asArray<{ url: string; size?: string }>(networkData.jsRequests);
  const cssRequests = asArray<{ url: string }>(networkData.cssRequests);
  const apiRequests = asArray<{ url: string; method: string; type: string }>(networkData.apiRequests);
  const thirdPartyRequests = asArray<{ domain: string; paths: string[]; category: string }>(networkData.thirdPartyRequests);
  const fontRequests = asArray<{ url: string }>(networkData.fontRequests);
  const linkPreloads = asArray<{ href: string; as: string }>(bundleData.linkPreloads);
  const exposedSecrets = asArray<{ type: string; location: string; partial: string }>(securityData.exposedSecrets);

  const allPaths = [
    ...jsRequests.map(j => j.url),
    ...cssRequests.map(c => c.url),
    ...apiRequests.map(a => a.url),
    ...scripts.map(s => s.src),
  ].filter(Boolean);

  const detections = runDetection({
    globalVariables: asArray<string>(bundleData.globalVariables),
    scripts,
    domSignals: asArray<string>(bundleData.frameworkSignals),
    metaTags: asArray<{ name: string; content: string }>(bundleData.metaTags),
    responseHeaders: (typeof networkData.responseHeaders === 'object' && networkData.responseHeaders) ? networkData.responseHeaders : {},
    allPaths,
    inlineScriptSnippets: asArray<string>(bundleData.inlineScriptSnippets),
  });

  // Add runtime config detections
  for (const ff of asArray<{ provider: string; evidence: string }>(runtimeData.featureFlags)) {
    if (!detections.some(d => d.name.toLowerCase().includes(ff.provider.toLowerCase()))) {
      detections.push({
        name: ff.provider,
        confidence: 'medium',
        evidence: ff.evidence,
        category: 'feature-flags',
      });
    }
  }

  for (const ab of asArray<{ provider: string; evidence: string }>(runtimeData.abTesting)) {
    if (!detections.some(d => d.name.toLowerCase().includes(ab.provider.toLowerCase()))) {
      detections.push({
        name: ab.provider,
        confidence: 'medium',
        evidence: ab.evidence,
        category: 'feature-flags',
        subcategory: 'A/B Testing',
      });
    }
  }

  // Build structured results
  const apiEndpoints: ApiEndpoint[] = apiRequests.map((a) => ({
    url: a.url,
    method: a.method || undefined,
  }));
  const networkAnalysis: NetworkAnalysis = {
    totalRequests: networkData.totalRequests || 0,
    totalSize: jsRequests.reduce((s, j) => s + (parseInt(j.size || '0', 10) || 0), 0) + ' bytes',
    apiEndpoints: apiEndpoints.filter(a => a.url),
    thirdPartyDomains: thirdPartyRequests.map(t => t.domain).filter(Boolean) as string[],
    cdnDomains: thirdPartyRequests.filter(t => t.category === 'cdn').map(t => t.domain).filter(Boolean) as string[],
    websocketUrls: asArray<string>(networkData.websocketUrls).filter(Boolean),
    graphqlEndpoints: apiRequests.filter(a => a.url?.includes('graphql')).map(a => a.url).filter(Boolean),
  };

  const performanceSignals: PerformanceSignals = {
    totalJsSize: `${jsRequests.length} files`,
    totalCssSize: `${cssRequests.length} files`,
    totalRequests: networkData.totalRequests || 0,
    jsChunkCount: jsRequests.length,
    cssFileCount: cssRequests.length,
    imageCount: networkData.imageRequests || 0,
    fontCount: fontRequests.length,
    serviceWorker: !!networkData.serviceWorkerUrl,
    preloadHints: linkPreloads.map(l => `${l.as}: ${l.href}`).filter(Boolean),
  };

  const securitySignals: SecuritySignals = {
    cspHeader: securityData.csp,
    hstsHeader: securityData.hsts,
    xFrameOptions: securityData.xFrameOptions,
    sourceMapsExposed: securityData.sourceMapsAvailable,
    exposedKeys: exposedSecrets.filter(s => s.type && s.partial).map(s => ({ type: s.type, partial: s.partial })),
    cors: securityData.corsHeaders,
  };

  const platformEvidence = asArray<string>(infraData.platformEvidence);
  const cdnEvidence = asArray<string>(infraData.cdnEvidence);

  const infraProfile: InfraProfile = {
    hostingPlatform: infraData.platform
      ? { name: infraData.platform, confidence: 'high', evidence: platformEvidence.join(', '), category: 'cdn-hosting' }
      : detections.find(d => d.category === 'cdn-hosting') || null,
    cdn: infraData.cdn
      ? { name: infraData.cdn, confidence: 'high', evidence: cdnEvidence.join(', '), category: 'cdn-hosting' }
      : null,
    serverHeader: infraData.serverHeader || (typeof networkData.responseHeaders === 'object' && networkData.responseHeaders?.['server']) || null,
    deploymentSignals: platformEvidence.filter(Boolean),
    edgeLocations: [],
    tlsVersion: null,
  };

  // ── Phase 7: Architecture diagram (deterministic, instant) ──
  const architectureDiagram = generateArchitectureDiagram(detections, networkAnalysis, infraProfile);

  // ── Phase 8: LLM Synthesis ───────────────────────────────
  onProgress?.({ stage: 'synthesizing', detail: 'Generating intelligence report...', progress: 80 });

  const [summaryResult, insightsResult] = await Promise.allSettled([
    generateTechStackSummary(url, detections, networkAnalysis, performanceSignals, infraProfile),
    generateCompetitiveInsights(url, detections, networkAnalysis, performanceSignals, securitySignals),
  ]);

  const fallbackSummary = `Detected ${detections.length} technologies across ${new Set(detections.map(d => d.category)).size} categories.`;

  const techStackSummary = (summaryResult.status === 'fulfilled' && typeof summaryResult.value === 'string')
    ? summaryResult.value || fallbackSummary
    : fallbackSummary;

  const competitiveInsights = (insightsResult.status === 'fulfilled' && Array.isArray(insightsResult.value))
    ? insightsResult.value
    : [];

  onProgress?.({ stage: 'complete', detail: 'Scan complete!', progress: 100 });

  return {
    url,
    timestamp: new Date().toISOString(),
    scanDuration: Date.now() - startTime,
    detections,
    networkAnalysis,
    performanceSignals,
    securitySignals,
    infraProfile,
    techStackSummary,
    architectureDiagram,
    competitiveInsights,
    ...(failedPhases.length > 0 && { failedPhases, warnings }),
  };
}
