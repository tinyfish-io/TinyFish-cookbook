import OpenAI from 'openai';
import { Detection, NetworkAnalysis, PerformanceSignals, SecuritySignals, InfraProfile } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

async function callLLM<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const text = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(text) as T;
}

/**
 * Generate a human-readable tech stack summary.
 */
export async function generateTechStackSummary(
  url: string,
  detections: Detection[],
  network: NetworkAnalysis,
  perf: PerformanceSignals,
  infra: InfraProfile
): Promise<string> {
  const result = await callLLM<{ summary: string }>(
    'You are a senior frontend architect analyzing a production website tech stack. Data is inferred from page source and DOM (scripts, links, headers when visible), not from browser DevTools. Write concise, technical analysis without overclaiming.',
    `Generate a 3-4 paragraph technical summary of this website's architecture based on detected technologies.

URL: ${url}

Detected Technologies:
${detections.map(d => `- ${d.name}${d.version ? ` v${d.version}` : ''} (${d.category}, ${d.confidence} confidence)`).join('\n')}

Resources (from page: scripts, links, visible URLs):
- ${network.totalRequests} resources
- ${network.apiEndpoints.length} API-like URLs seen in page
- ${network.thirdPartyDomains.length} third-party domains (from script/link URLs)
- ${network.websocketUrls.length > 0 ? 'WebSocket URLs in page' : 'No WebSocket URLs'}
- ${network.graphqlEndpoints.length > 0 ? 'GraphQL-style URLs' : 'REST-style'}

Performance:
- JS bundles: ${perf.jsChunkCount} chunks, ${perf.totalJsSize} total
- ${perf.serviceWorker ? 'Service Worker active' : 'No Service Worker'}

Infrastructure:
- Hosting: ${infra.hostingPlatform?.name || 'Unknown'}
- CDN: ${infra.cdn?.name || 'Unknown'}
- Server: ${infra.serverHeader || 'Unknown'}

Return JSON: { "summary": "<your summary here>" }`
  );
  return result.summary || '';
}

/**
 * Escape a string for safe use inside Mermaid double-quoted node labels ("...").
 * With htmlLabels: true in the renderer, HTML entities are correctly interpreted,
 * so we escape &, <, > for XSS prevention and replace " with ' to prevent
 * premature label termination. Parentheses, brackets, and % are safe inside
 * double-quoted strings and must NOT be entity-escaped (they'd display literally
 * if htmlLabels were ever toggled off).
 */
function esc(str: string): string {
  return str
    .replace(/[\r\n]+/g, ' ')       // collapse newlines (prevents multi-line label issues)
    .replace(/&/g, '&amp;')         // must be first to avoid double-encoding
    .replace(/</g, '&lt;')          // prevent HTML tag injection
    .replace(/>/g, '&gt;')          // prevent HTML tag injection
    .replace(/"/g, "'")             // " would terminate Mermaid quoted labels
    .trim();
}

/**
 * Build a Mermaid.js architecture diagram from detected technologies.
 * Deterministic — no LLM call needed. Instant and always valid.
 */
export function generateArchitectureDiagram(
  detections: Detection[],
  network: NetworkAnalysis,
  infra: InfraProfile
): string {
  const byCategory = (cats: string[]) =>
    detections.filter(d => cats.includes(d.category)).map(d => d.name);

  const frameworks = byCategory(['framework']);
  const uiLibs = byCategory(['ui-library']);
  const stateManagement = byCategory(['state-management']);
  const buildTools = byCategory(['build-tool']);
  const analytics = byCategory(['analytics']);
  const monitoring = byCategory(['monitoring']);
  const featureFlags = byCategory(['feature-flags']);
  const auth = byCategory(['auth']);
  const payments = byCategory(['payment']);
  const thirdParty = byCategory(['third-party']);
  const cms = byCategory(['cms']);

  const apiType = network.graphqlEndpoints.length > 0 ? 'GraphQL' : 'REST';
  const hosting = esc(infra.hostingPlatform?.name || 'Unknown');
  const cdn = infra.cdn?.name ? esc(infra.cdn.name) : null;
  const server = infra.serverHeader ? esc(infra.serverHeader) : null;

  const lines: string[] = ['graph TB'];

  // ── Client layer (always a subgraph so "client" id is always defined) ──
  const clientParts = [...frameworks, ...uiLibs].filter(Boolean);
  lines.push('  subgraph client ["Client Layer"]');
  if (clientParts.length > 0) {
    lines.push(`    FW["${esc(clientParts.join(' + '))}"]`);
  } else {
    lines.push('    FW["Unknown"]');
  }
  if (stateManagement.length > 0) {
    lines.push(`    SM["State: ${esc(stateManagement.join(', '))}"]`);
    lines.push('    FW --> SM');
  }
  lines.push('  end');

  // ── Build layer ───────────────────────────────
  if (buildTools.length > 0) {
    lines.push(`  BUILD["Build: ${esc(buildTools.join(', '))}"]`);
    lines.push('  client --> BUILD');
  }

  // ── API layer ─────────────────────────────────
  const epCount = network.apiEndpoints.length;
  lines.push(`  API["${esc(apiType)} API${epCount > 0 ? ` - ${epCount} endpoints` : ''}"]`);
  if (buildTools.length > 0) {
    lines.push('  BUILD --> API');
  } else {
    lines.push('  client --> API');
  }

  // ── Infrastructure layer ──────────────────────
  lines.push('  subgraph infra ["Infrastructure"]');
  lines.push(`    HOST["${hosting}"]`);
  if (cdn) {
    lines.push(`    CDN["CDN: ${cdn}"]`);
    lines.push('    CDN --> HOST');
  }
  if (server) {
    lines.push(`    SRV["Server: ${server}"]`);
    lines.push('    SRV --> HOST');
  }
  lines.push('  end');
  lines.push('  API --> HOST');

  // ── Third-party services ──────────────────────
  const services = [
    ...analytics, ...monitoring, ...auth,
    ...payments, ...featureFlags, ...thirdParty, ...cms,
  ];

  if (services.length > 0) {
    lines.push('  subgraph services ["Third-Party Services"]');
    services.forEach((svc, i) => {
      lines.push(`    SVC${i}["${esc(svc)}"]`);
    });
    lines.push('  end');
    lines.push('  client --> services');
  }

  // ── WebSocket / Real-time ─────────────────────
  if (network.websocketUrls.length > 0) {
    lines.push('  WS["WebSocket"]');
    lines.push('  client --> WS');
  }

  return lines.join('\n');
}

/**
 * Generate competitive intelligence insights.
 */
export async function generateCompetitiveInsights(
  url: string,
  detections: Detection[],
  network: NetworkAnalysis,
  perf: PerformanceSignals,
  security: SecuritySignals
): Promise<string[]> {
  const result = await callLLM<{ insights: string[] }>(
    'You are a competitive intelligence analyst for engineering teams. Provide actionable, specific insights.',
    `Based on this tech stack analysis, generate 5-8 competitive intelligence insights that would be valuable to an engineering leader evaluating this company.

URL: ${url}

Stack: ${detections.map(d => d.name).join(', ')}
API: ${network.graphqlEndpoints.length > 0 ? 'GraphQL' : 'REST'}, ${network.apiEndpoints.length} API-like URLs
Performance: ${perf.jsChunkCount} JS chunks (${perf.totalJsSize}), ${perf.totalRequests} resources
Security: CSP: ${security.cspHeader ? 'Yes' : 'No'}, HSTS: ${security.hstsHeader}, Source Maps: ${security.sourceMapsExposed ? 'EXPOSED' : 'Protected'}
Feature Flags: ${detections.filter(d => d.category === 'feature-flags').map(d => d.name).join(', ') || 'None detected'}
Monitoring: ${detections.filter(d => d.category === 'monitoring').map(d => d.name).join(', ') || 'None detected'}

Focus on: engineering maturity signals, build-vs-buy decisions, technical debt indicators, scaling readiness, security posture, and innovation signals.

Return JSON: { "insights": ["<insight 1>", "<insight 2>", ...] }`
  );
  return result.insights || [];
}
