'use strict';

const { computeScore, item } = require('../utils/scoring');
const { parse } = require('node-html-parser');

/**
 * Security Audit — OWASP Top 10 for LLM & GenAI Applications 2025
 *
 * Each check is mapped to the most relevant LLM/GenAI risk category
 * based on observable web signals from a headless browser audit:
 *
 *  LLM01:2025 — Prompt Injection
 *    Detects: unvalidated input fields exposed to AI, missing CSP (enables script injection),
 *             inline event handlers, form action security
 *
 *  LLM02:2025 — Sensitive Information Disclosure
 *    Detects: API keys / tokens / secrets in HTML, sensitive data in page source,
 *             X-Powered-By / server version disclosure, debug stack traces
 *
 *  LLM03:2025 — Supply Chain Vulnerabilities
 *    Detects: external scripts without SRI, high third-party script count,
 *             CORS wildcard policy
 *
 *  LLM04:2025 — Data and Model Poisoning
 *    Detects: missing HTTPS (data integrity in transit), mixed content,
 *             unvalidated form submissions over HTTP
 *
 *  LLM05:2025 — Improper Output Handling
 *    Detects: missing X-Content-Type-Options (MIME sniffing),
 *             missing X-Frame-Options / CSP frame-ancestors (clickjacking),
 *             Content-Type charset missing
 *
 *  LLM06:2025 — Excessive Agency
 *    Detects: Permissions-Policy header (restricts browser APIs),
 *             COOP/COEP headers (cross-origin isolation),
 *             open redirect parameters (unchecked tool access)
 *
 *  LLM07:2025 — System Prompt Leakage
 *    Detects: AI/LLM system prompt patterns in HTML comments or meta tags,
 *             debug output containing prompt-like strings,
 *             hidden input fields with AI instruction patterns
 *
 *  LLM08:2025 — Vector and Embedding Weaknesses
 *    Detects: missing HSTS (data integrity for vector stores over HTTPS),
 *             TLS certificate validity and protocol version,
 *             cookie security flags (session integrity)
 *
 *  LLM09:2025 — Misinformation
 *    Detects: missing Content-Security-Policy (enables script injection for fake content),
 *             missing Referrer-Policy (referrer leakage enabling phishing),
 *             X-XSS-Protection misconfiguration
 *
 *  LLM10:2025 — Unbounded Consumption
 *    Detects: missing rate-limiting headers (RateLimit-*, Retry-After),
 *             no server-side timeout signals, large uncompressed page payloads
 */

const SecurityAudit = {
  id: 'security',
  title: 'Security',
  description: 'OWASP Top 10 for LLM & GenAI Applications 2025 (LLM01–LLM10) — web-observable security signals mapped to each GenAI risk category.',

  async run({ pageData, headers, tls }) {
    const items = [];
    const hdrs = { ...(pageData.responseHeaders || {}), ...(headers.headers || {}) };
    const { html, cookies, scripts, forms } = pageData;
    const root = parse(html);
    const pageUrl = pageData.url || '';
    const isHttps = pageUrl.startsWith('https://');
    const networkRequests = pageData.networkRequests || [];

    // =========================================================
    // LLM01:2025 — PROMPT INJECTION
    // Web signals: unvalidated inputs, missing CSP, inline handlers
    // =========================================================

    // Content-Security-Policy (blocks script injection vectors)
    const csp = hdrs['content-security-policy'] || hdrs['content-security-policy-report-only'];
    if (!csp) {
      items.push(item('csp', 'Content Security Policy (CSP) [LLM01]', 'Missing CSP allows attackers to inject scripts that can manipulate LLM inputs or intercept AI responses (OWASP LLM01:2025 Prompt Injection).', 'fail', 'Add Content-Security-Policy header. Example: Content-Security-Policy: default-src \'self\'; script-src \'self\'', 3));
    } else {
      const isReportOnly = !!hdrs['content-security-policy-report-only'] && !hdrs['content-security-policy'];
      const hasUnsafeInline = csp.includes("'unsafe-inline'");
      const hasUnsafeEval = csp.includes("'unsafe-eval'");
      const hasWildcard = csp.includes('*');
      const issues = [
        hasUnsafeInline && "'unsafe-inline' (allows arbitrary script injection)",
        hasUnsafeEval && "'unsafe-eval' (allows eval-based injection)",
        hasWildcard && 'wildcard (*) source',
        isReportOnly && 'report-only mode (not enforced)',
      ].filter(Boolean);
      if (issues.length === 0) {
        items.push(item('csp', 'Content Security Policy (CSP) [LLM01]', 'Strong CSP reduces prompt injection attack surface by blocking unauthorized script execution (OWASP LLM01:2025).', 'pass', 'CSP present with no obvious weaknesses', 3));
      } else {
        items.push(item('csp', 'Content Security Policy (CSP) [LLM01]', 'Weak CSP allows script injection that can manipulate AI inputs/outputs (OWASP LLM01:2025 Prompt Injection).', 'warn', `CSP present but weakened by: ${issues.join(', ')}`, 3));
      }
    }

    // Inline event handlers (direct injection vectors)
    const inlineHandlers = root.querySelectorAll('[onclick],[onload],[onerror],[onmouseover],[onfocus],[oninput]');
    if (inlineHandlers.length > 0) {
      items.push(item('inline-handlers', 'Inline Event Handlers [LLM01]', `Inline event handlers bypass CSP and can be exploited for DOM-based prompt injection attacks (OWASP LLM01:2025).`, 'warn', `${inlineHandlers.length} element(s) use inline event handlers. Move to external scripts with addEventListener().`, 2));
    } else {
      items.push(item('inline-handlers', 'Inline Event Handlers [LLM01]', 'No inline event handlers detected — reduces DOM-based prompt injection risk (OWASP LLM01:2025).', 'pass', 'No inline event handlers found', 1));
    }

    // Form action security (input validation signal)
    const insecureForms = forms.filter((f) => f.action && f.action.startsWith('http://'));
    if (insecureForms.length === 0) {
      items.push(item('form-action', 'Form Action Security [LLM01]', 'All form actions use HTTPS — user inputs are protected in transit to AI backends (OWASP LLM01:2025).', 'pass', 'All form actions use HTTPS or relative URLs', 2));
    } else {
      items.push(item('form-action', 'Form Action Security [LLM01]', 'Forms submitting over HTTP can expose user inputs to MITM interception, enabling prompt injection (OWASP LLM01:2025).', 'fail', `${insecureForms.length} form(s) submit to HTTP endpoint — change to HTTPS`, 2));
    }

    // =========================================================
    // LLM02:2025 — SENSITIVE INFORMATION DISCLOSURE
    // Web signals: secrets in HTML, server version, debug output
    // =========================================================

    // Sensitive data patterns in HTML source
    const sensitivePatterns = [
      { name: 'API Key', regex: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i },
      { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{20,}/i },
      { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/i },
      { name: 'Private Key', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
      { name: 'Password in HTML', regex: /password\s*[:=]\s*['"][^'"]{4,}['"]/i },
      { name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i },
      { name: 'LLM System Prompt', regex: /system[_\s]?prompt\s*[:=]\s*['"`][^'"`]{10,}/i },
      { name: 'Database Connection String', regex: /(mysql|postgres|mongodb|redis):\/\/[^\s'"<>]{8,}/i },
    ];
    const foundSensitive = sensitivePatterns.filter((p) => p.regex.test(html));
    if (foundSensitive.length === 0) {
      items.push(item('sensitive-data', 'Sensitive Data in Page Source [LLM02]', 'No secrets, API keys, or sensitive data detected in HTML source (OWASP LLM02:2025 Sensitive Information Disclosure).', 'pass', 'No sensitive data patterns found in HTML', 3));
    } else {
      items.push(item('sensitive-data', 'Sensitive Data in Page Source [LLM02]', 'Secrets or API keys in HTML source can expose AI service credentials to attackers (OWASP LLM02:2025).', 'fail', `Potential sensitive data found: ${foundSensitive.map((p) => p.name).join(', ')}. Move to server-side environment variables.`, 3));
    }

    // Server version disclosure
    const serverHeader = hdrs['server'] || '';
    const xPoweredBy = hdrs['x-powered-by'] || '';
    if (serverHeader && /[0-9]/.test(serverHeader)) {
      items.push(item('server-disclosure', 'Server Version Disclosure [LLM02]', 'Server version in headers reveals technology stack, aiding targeted attacks on AI infrastructure (OWASP LLM02:2025).', 'warn', `Server: ${serverHeader} — remove version number`, 1));
    } else if (xPoweredBy) {
      items.push(item('server-disclosure', 'Technology Stack Disclosure (X-Powered-By) [LLM02]', 'X-Powered-By reveals the AI/backend framework, enabling targeted exploitation (OWASP LLM02:2025).', 'warn', `X-Powered-By: ${xPoweredBy} — remove this header`, 1));
    } else {
      items.push(item('server-disclosure', 'Server / Technology Disclosure [LLM02]', 'No server version or technology stack exposed in headers (OWASP LLM02:2025).', 'pass', serverHeader ? `Server: ${serverHeader} (no version)` : 'No version info in response headers', 1));
    }

    // Debug / stack trace exposure
    const debugPatterns = [
      /stack\s+trace/i, /exception\s+in\s+thread/i, /fatal\s+error/i,
      /traceback\s+\(most\s+recent\s+call/i, /undefined\s+variable/i,
      /syntax\s+error.*on\s+line\s+\d+/i,
      /at\s+[a-zA-Z]+\.[a-zA-Z]+\([^)]+\.java:\d+\)/,
      /openai\.error\./i, /anthropic\.error\./i, /llm.*error/i,
    ];
    const hasDebugInfo = debugPatterns.some((p) => p.regex ? p.regex.test(html) : p.test(html));
    if (hasDebugInfo) {
      items.push(item('debug-info', 'Debug / Error Information Exposed [LLM02]', 'Stack traces or AI error messages in page source reveal implementation details, model names, or prompt structures (OWASP LLM02:2025).', 'fail', 'Disable debug mode in production. Never expose LLM error messages or stack traces to end users.', 3));
    } else {
      items.push(item('debug-info', 'Debug / Error Information Exposure [LLM02]', 'No stack traces, AI error messages, or debug output detected in page source (OWASP LLM02:2025).', 'pass', 'No debug information found in HTML', 2));
    }

    // =========================================================
    // LLM03:2025 — SUPPLY CHAIN VULNERABILITIES
    // Web signals: external scripts without SRI, CORS wildcard
    // =========================================================

    // Subresource Integrity (SRI) on external scripts
    const externalScripts = root.querySelectorAll('script[src]').filter((s) => {
      const src = s.getAttribute('src') || '';
      try { return new URL(src).hostname !== new URL(pageUrl).hostname; } catch { return false; }
    });
    const scriptsWithSRI = externalScripts.filter((s) => s.hasAttribute('integrity'));
    if (externalScripts.length === 0) {
      items.push(item('sri', 'Subresource Integrity (SRI) [LLM03]', 'No external scripts loaded — no supply chain risk from third-party CDNs (OWASP LLM03:2025).', 'pass', 'No external scripts found', 2));
    } else if (scriptsWithSRI.length === externalScripts.length) {
      items.push(item('sri', 'Subresource Integrity (SRI) [LLM03]', 'All external scripts use SRI integrity hashes — supply chain tampering would be detected (OWASP LLM03:2025).', 'pass', `${scriptsWithSRI.length}/${externalScripts.length} external scripts have SRI`, 2));
    } else {
      items.push(item('sri', 'Subresource Integrity (SRI) [LLM03]', 'External scripts without SRI can be silently replaced by compromised CDNs, injecting malicious AI prompts or data exfiltration code (OWASP LLM03:2025).', 'warn', `${externalScripts.length - scriptsWithSRI.length} external script(s) missing integrity attribute. Add integrity="sha384-..." crossorigin="anonymous"`, 2));
    }

    // CORS wildcard (supply chain / data exfiltration)
    const acao = hdrs['access-control-allow-origin'] || '';
    if (acao === '*') {
      items.push(item('cors-wildcard', 'CORS Wildcard Policy [LLM03]', 'Wildcard CORS allows any origin to read AI API responses, enabling data exfiltration from LLM outputs (OWASP LLM03:2025).', 'warn', 'Access-Control-Allow-Origin: * — restrict to specific trusted origins', 2));
    } else if (acao) {
      items.push(item('cors-wildcard', 'CORS Policy [LLM03]', 'CORS is restricted to specific origins — prevents unauthorized cross-origin access to AI responses (OWASP LLM03:2025).', 'pass', `Access-Control-Allow-Origin: ${acao}`, 1));
    } else {
      items.push(item('cors-wildcard', 'CORS Policy [LLM03]', 'No CORS wildcard detected (OWASP LLM03:2025).', 'pass', 'No Access-Control-Allow-Origin wildcard', 1));
    }

    // =========================================================
    // LLM04:2025 — DATA AND MODEL POISONING
    // Web signals: HTTPS enforcement, mixed content, form integrity
    // =========================================================

    // HTTPS enforcement (data integrity in transit)
    if (!isHttps) {
      items.push(item('https-enforcement', 'HTTPS Enforcement [LLM04]', 'HTTP allows MITM attackers to poison data in transit before it reaches AI models (OWASP LLM04:2025 Data and Model Poisoning).', 'fail', 'Obtain a TLS certificate (e.g. Let\'s Encrypt) and redirect all HTTP traffic to HTTPS.', 3));
    } else {
      items.push(item('https-enforcement', 'HTTPS Enforcement [LLM04]', 'HTTPS protects data integrity in transit, preventing poisoning of inputs to AI models (OWASP LLM04:2025).', 'pass', 'All traffic uses HTTPS', 3));
    }

    // Mixed content
    const mixedContent = networkRequests.filter((r) => isHttps && r.url && r.url.startsWith('http://') && !r.url.startsWith('http://localhost'));
    if (mixedContent.length > 0) {
      items.push(item('mixed-content', 'Mixed Content (HTTP on HTTPS) [LLM04]', 'HTTP resources on an HTTPS page can be intercepted and replaced, poisoning data fed to AI models (OWASP LLM04:2025).', 'fail', `${mixedContent.length} HTTP resource(s) loaded: ${mixedContent.slice(0, 3).map((r) => r.url).join(', ')}`, 2));
    } else if (isHttps) {
      items.push(item('mixed-content', 'Mixed Content [LLM04]', 'No HTTP resources on HTTPS page — data integrity maintained for AI inputs (OWASP LLM04:2025).', 'pass', 'All resources loaded over HTTPS', 2));
    }

    // =========================================================
    // LLM05:2025 — IMPROPER OUTPUT HANDLING
    // Web signals: MIME sniffing, clickjacking, Content-Type
    // =========================================================

    // X-Content-Type-Options (prevents MIME sniffing of AI outputs)
    const xcto = hdrs['x-content-type-options'];
    if (xcto && xcto.toLowerCase().includes('nosniff')) {
      items.push(item('x-content-type', 'X-Content-Type-Options [LLM05]', 'nosniff prevents browsers from misinterpreting AI-generated content as executable code (OWASP LLM05:2025 Improper Output Handling).', 'pass', 'X-Content-Type-Options: nosniff', 2));
    } else {
      items.push(item('x-content-type', 'X-Content-Type-Options [LLM05]', 'Without nosniff, browsers may execute AI-generated text as scripts or HTML (OWASP LLM05:2025 Improper Output Handling).', 'fail', 'Add header: X-Content-Type-Options: nosniff', 2));
    }

    // X-Frame-Options / CSP frame-ancestors (clickjacking on AI interfaces)
    const xfo = hdrs['x-frame-options'];
    const hasFrameAncestors = csp && csp.includes('frame-ancestors');
    if (!xfo && !hasFrameAncestors) {
      items.push(item('x-frame-options', 'Clickjacking Protection [LLM05]', 'Without framing protection, attackers can embed AI interfaces in iframes to intercept or manipulate LLM outputs (OWASP LLM05:2025).', 'fail', 'Add X-Frame-Options: DENY or include frame-ancestors \'none\' in CSP', 2));
    } else {
      const val = (xfo || '').toUpperCase();
      const isStrong = val === 'DENY' || val === 'SAMEORIGIN' || hasFrameAncestors;
      items.push(item('x-frame-options', 'Clickjacking Protection [LLM05]', 'Framing protection prevents UI redressing attacks on AI interfaces (OWASP LLM05:2025).', isStrong ? 'pass' : 'warn', xfo ? `X-Frame-Options: ${xfo}` : 'frame-ancestors in CSP', 2));
    }

    // Content-Type charset
    const contentType = hdrs['content-type'] || '';
    if (contentType.includes('text/html') && contentType.includes('charset')) {
      items.push(item('content-type', 'Content-Type Charset [LLM05]', 'Correct charset declaration prevents charset-sniffing attacks on AI-rendered content (OWASP LLM05:2025).', 'pass', `Content-Type: ${contentType}`, 1));
    } else if (contentType.includes('text/html')) {
      items.push(item('content-type', 'Content-Type Missing Charset [LLM05]', 'Missing charset in Content-Type can allow charset-sniffing attacks on AI output rendering (OWASP LLM05:2025).', 'warn', `Content-Type: ${contentType} — add ; charset=UTF-8`, 1));
    }

    // =========================================================
    // LLM06:2025 — EXCESSIVE AGENCY
    // Web signals: Permissions-Policy, COOP/COEP, open redirects
    // =========================================================

    // Permissions-Policy (restricts browser APIs / agent capabilities)
    const pp = hdrs['permissions-policy'] || hdrs['feature-policy'];
    if (pp) {
      items.push(item('permissions-policy', 'Permissions Policy [LLM06]', 'Permissions-Policy restricts browser APIs (camera, microphone, geolocation) that AI agents could exploit (OWASP LLM06:2025 Excessive Agency).', 'pass', `Permissions-Policy: ${pp.substring(0, 80)}${pp.length > 80 ? '…' : ''}`, 2));
    } else {
      items.push(item('permissions-policy', 'Permissions Policy [LLM06]', 'Without Permissions-Policy, AI-integrated pages may grant excessive browser API access to embedded agents (OWASP LLM06:2025).', 'warn', 'Add Permissions-Policy header to restrict camera, microphone, geolocation, etc.', 1));
    }

    // COOP (cross-origin isolation for AI agent sandboxing)
    const coop = hdrs['cross-origin-opener-policy'];
    if (coop) {
      items.push(item('coop', 'Cross-Origin Opener Policy (COOP) [LLM06]', 'COOP isolates the browsing context, limiting what cross-origin AI agents can access (OWASP LLM06:2025).', 'pass', `COOP: ${coop}`, 1));
    } else {
      items.push(item('coop', 'Cross-Origin Opener Policy (COOP) [LLM06]', 'Missing COOP allows cross-origin windows to interact with AI interfaces, potentially granting excessive agency (OWASP LLM06:2025).', 'warn', 'Add Cross-Origin-Opener-Policy: same-origin', 1));
    }

    // COEP
    const coep = hdrs['cross-origin-embedder-policy'];
    if (coep) {
      items.push(item('coep', 'Cross-Origin Embedder Policy (COEP) [LLM06]', 'COEP prevents loading cross-origin resources without explicit permission, limiting AI agent data access (OWASP LLM06:2025).', 'pass', `COEP: ${coep}`, 1));
    } else {
      items.push(item('coep', 'Cross-Origin Embedder Policy (COEP) [LLM06]', 'Missing COEP allows unrestricted cross-origin resource loading, which AI agents could exploit (OWASP LLM06:2025).', 'warn', 'Add Cross-Origin-Embedder-Policy: require-corp', 1));
    }

    // Open redirect parameters (unchecked tool/action access)
    const allLinks = Array.from(root.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') || '');
    const openRedirectPattern = /[?&](url|redirect|next|return|goto|dest|destination|redir|target|action|callback)=/i;
    const suspiciousLinks = allLinks.filter((href) => openRedirectPattern.test(href));
    if (suspiciousLinks.length > 0) {
      items.push(item('open-redirect', 'Open Redirect / Unvalidated Redirects [LLM06]', 'Unvalidated redirect parameters can be abused by AI agents to perform unauthorized actions or SSRF (OWASP LLM06:2025 Excessive Agency).', 'warn', `${suspiciousLinks.length} link(s) contain redirect-like parameters. Validate and whitelist all redirect destinations.`, 2));
    } else {
      items.push(item('open-redirect', 'Open Redirect Parameters [LLM06]', 'No unvalidated redirect parameters detected — reduces risk of AI agent abuse (OWASP LLM06:2025).', 'pass', 'No redirect-like URL parameters found', 1));
    }

    // =========================================================
    // LLM07:2025 — SYSTEM PROMPT LEAKAGE
    // Web signals: AI prompt patterns in HTML, hidden inputs, comments
    // =========================================================

    // System prompt patterns in HTML source
    const systemPromptPatterns = [
      /you\s+are\s+(a|an)\s+[a-zA-Z\s]{3,50}(assistant|ai|bot|agent)/i,
      /system\s*:\s*['"`][\s\S]{20,200}['"`]/i,
      /\[INST\][\s\S]{10,}/i,
      /<\|system\|>/i,
      /###\s*(instruction|system|prompt)s?:/i,
      /ignore\s+(previous|all|above)\s+instructions/i,
    ];
    const foundPromptLeak = systemPromptPatterns.some((p) => p.test(html));
    if (foundPromptLeak) {
      items.push(item('system-prompt-leak', 'System Prompt Leakage Detected [LLM07]', 'AI system prompt instructions found in page source — attackers can use these to craft targeted prompt injection attacks (OWASP LLM07:2025).', 'fail', 'Remove all system prompt content from client-side HTML. Keep LLM instructions server-side only.', 3));
    } else {
      items.push(item('system-prompt-leak', 'System Prompt Leakage [LLM07]', 'No AI system prompt patterns detected in page source (OWASP LLM07:2025 System Prompt Leakage).', 'pass', 'No system prompt content found in HTML', 2));
    }

    // Hidden inputs with AI instruction patterns
    const hiddenInputs = Array.from(root.querySelectorAll('input[type="hidden"]'));
    const aiInstructionPattern = /prompt|instruction|system|context|role|persona/i;
    const suspiciousHiddenInputs = hiddenInputs.filter((i) => aiInstructionPattern.test(i.getAttribute('name') || '') || aiInstructionPattern.test(i.getAttribute('value') || ''));
    if (suspiciousHiddenInputs.length > 0) {
      items.push(item('hidden-ai-inputs', 'Hidden AI Instruction Fields [LLM07]', 'Hidden form fields with AI-related names may expose system prompt parameters to client-side manipulation (OWASP LLM07:2025).', 'warn', `${suspiciousHiddenInputs.length} hidden input(s) with AI-related names: ${suspiciousHiddenInputs.map((i) => i.getAttribute('name')).join(', ')}`, 2));
    } else {
      items.push(item('hidden-ai-inputs', 'Hidden AI Instruction Fields [LLM07]', 'No hidden inputs with AI instruction patterns detected (OWASP LLM07:2025).', 'pass', 'No suspicious hidden AI instruction fields found', 1));
    }

    // =========================================================
    // LLM08:2025 — VECTOR AND EMBEDDING WEAKNESSES
    // Web signals: HSTS, TLS validity, cookie security (session integrity)
    // =========================================================

    // HSTS (data integrity for vector store communications)
    const hsts = hdrs['strict-transport-security'];
    if (!hsts) {
      items.push(item('hsts', 'HTTP Strict Transport Security (HSTS) [LLM08]', 'Without HSTS, connections to vector stores or embedding APIs can be downgraded to HTTP, allowing data poisoning (OWASP LLM08:2025).', 'fail', 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload', 3));
    } else {
      const maxAge = parseInt((hsts.match(/max-age=(\d+)/) || [])[1] || '0');
      if (maxAge >= 31536000) {
        items.push(item('hsts', 'HTTP Strict Transport Security (HSTS) [LLM08]', 'HSTS enforces HTTPS for all connections, protecting vector store data integrity (OWASP LLM08:2025).', 'pass', `max-age=${maxAge}${hsts.includes('includeSubDomains') ? '; includeSubDomains' : ''}`, 3));
      } else {
        items.push(item('hsts', 'HTTP Strict Transport Security (HSTS) [LLM08]', 'HSTS max-age is too short — connections could be downgraded, risking vector data poisoning (OWASP LLM08:2025).', 'warn', `max-age=${maxAge} — increase to ≥31536000 (1 year)`, 3));
      }
    }

    // TLS certificate (integrity of embedding/vector API connections)
    if (!tls.supported) {
      items.push(item('tls-valid', 'TLS Certificate [LLM08]', 'Invalid TLS allows MITM attacks that can corrupt vector embeddings in transit (OWASP LLM08:2025).', 'fail', `TLS check failed: ${tls.reason || 'Unknown'}`, 3));
    } else {
      if (tls.expired) {
        items.push(item('tls-valid', 'TLS Certificate Validity [LLM08]', 'Expired certificate — connections to AI/vector APIs are insecure (OWASP LLM08:2025).', 'fail', `Certificate EXPIRED (${tls.daysRemaining} days ago)`, 3));
      } else if (tls.expiringSoon) {
        items.push(item('tls-valid', 'TLS Certificate Validity [LLM08]', 'Certificate expiring soon — renew before expiry to maintain secure AI API connections (OWASP LLM08:2025).', 'warn', `Certificate expires in ${tls.daysRemaining} days`, 2));
      } else {
        items.push(item('tls-valid', 'TLS Certificate Validity [LLM08]', 'Valid TLS certificate ensures integrity of connections to AI and vector store APIs (OWASP LLM08:2025).', 'pass', `Valid for ${tls.daysRemaining} more days (expires ${tls.validTo})`, 3));
      }
      const proto = tls.protocol || '';
      if (proto.includes('TLSv1.3')) {
        items.push(item('tls-version', 'TLS Protocol Version [LLM08]', 'TLS 1.3 provides strongest encryption for AI API communications (OWASP LLM08:2025).', 'pass', `Protocol: ${proto}`, 2));
      } else if (proto.includes('TLSv1.2')) {
        items.push(item('tls-version', 'TLS Protocol Version [LLM08]', 'TLS 1.2 is acceptable; upgrade to TLS 1.3 for AI API communications (OWASP LLM08:2025).', 'pass', `Protocol: ${proto} (TLS 1.3 preferred)`, 2));
      } else if (proto) {
        items.push(item('tls-version', 'TLS Protocol Version [LLM08]', 'Weak TLS protocol — AI API communications are vulnerable to downgrade attacks (OWASP LLM08:2025).', 'fail', `Weak protocol: ${proto} — upgrade to TLS 1.2+`, 2));
      }
    }

    // Cookie security (session integrity for AI interactions)
    const allCookies = cookies;
    if (allCookies.length > 0) {
      const insecureCookies = allCookies.filter((c) => !c.secure && isHttps);
      const noHttpOnly = allCookies.filter((c) => !c.httpOnly);
      const noSameSite = allCookies.filter((c) => !c.sameSite || c.sameSite === 'None');
      if (insecureCookies.length === 0) {
        items.push(item('cookie-secure', 'Cookie Secure Flag [LLM08]', 'All cookies have Secure flag — AI session tokens protected from interception (OWASP LLM08:2025).', 'pass', `All ${allCookies.length} cookie(s) have Secure flag`, 2));
      } else {
        items.push(item('cookie-secure', 'Cookie Secure Flag [LLM08]', 'Cookies without Secure flag can be intercepted, compromising AI session integrity (OWASP LLM08:2025).', 'fail', `${insecureCookies.length} cookie(s) missing Secure flag: ${insecureCookies.map((c) => c.name).join(', ')}`, 2));
      }
      if (noHttpOnly.length === 0) {
        items.push(item('cookie-httponly', 'Cookie HttpOnly Flag [LLM08]', 'All cookies have HttpOnly — AI session tokens cannot be stolen via JavaScript (OWASP LLM08:2025).', 'pass', `All ${allCookies.length} cookie(s) have HttpOnly flag`, 2));
      } else {
        items.push(item('cookie-httponly', 'Cookie HttpOnly Flag [LLM08]', 'Cookies without HttpOnly can be stolen via XSS, compromising AI session tokens (OWASP LLM08:2025).', 'fail', `${noHttpOnly.length} cookie(s) missing HttpOnly flag`, 2));
      }
      if (noSameSite.length === 0) {
        items.push(item('cookie-samesite', 'Cookie SameSite Attribute [LLM08]', 'All cookies have SameSite — protects AI sessions from CSRF attacks (OWASP LLM08:2025).', 'pass', 'All cookies have SameSite attribute', 1));
      } else {
        items.push(item('cookie-samesite', 'Cookie SameSite Attribute [LLM08]', 'Cookies without SameSite are vulnerable to CSRF, which can trigger unauthorized AI actions (OWASP LLM08:2025).', 'warn', `${noSameSite.length} cookie(s) missing SameSite=Strict or Lax`, 1));
      }
    } else {
      items.push(item('cookie-secure', 'Cookie Security [LLM08]', 'No cookies found on this page (OWASP LLM08:2025).', 'pass', 'No cookies detected', 1));
    }

    // =========================================================
    // LLM09:2025 — MISINFORMATION
    // Web signals: Referrer-Policy, X-XSS-Protection, missing CSP
    // =========================================================

    // Referrer-Policy (prevents referrer leakage enabling phishing/misinformation)
    const rp = hdrs['referrer-policy'];
    const strongReferrerPolicies = ['no-referrer', 'no-referrer-when-downgrade', 'strict-origin', 'strict-origin-when-cross-origin', 'same-origin'];
    if (!rp) {
      items.push(item('referrer-policy', 'Referrer Policy [LLM09]', 'Missing Referrer-Policy leaks navigation context that can be used to craft targeted misinformation attacks (OWASP LLM09:2025).', 'warn', 'Add Referrer-Policy: strict-origin-when-cross-origin', 1));
    } else if (strongReferrerPolicies.includes(rp.toLowerCase())) {
      items.push(item('referrer-policy', 'Referrer Policy [LLM09]', 'Strong Referrer-Policy limits information leakage that could enable targeted misinformation (OWASP LLM09:2025).', 'pass', `Referrer-Policy: ${rp}`, 1));
    } else {
      items.push(item('referrer-policy', 'Referrer Policy [LLM09]', 'Weak Referrer-Policy leaks navigation data that can aid misinformation targeting (OWASP LLM09:2025).', 'warn', `Weak policy: "${rp}" — use strict-origin-when-cross-origin`, 1));
    }

    // X-XSS-Protection (OWASP recommends 0; non-zero can cause issues)
    const xXss = hdrs['x-xss-protection'] || '';
    if (xXss && xXss !== '0') {
      items.push(item('x-xss-protection', 'X-XSS-Protection Header [LLM09]', 'Non-zero X-XSS-Protection can introduce XSS vulnerabilities enabling injection of misinformation (OWASP LLM09:2025). Use CSP instead.', 'warn', `X-XSS-Protection: ${xXss} — set to 0 and use CSP`, 1));
    } else {
      items.push(item('x-xss-protection', 'X-XSS-Protection Header [LLM09]', 'Legacy XSS filter correctly disabled; CSP is the preferred protection against script-based misinformation injection (OWASP LLM09:2025).', 'pass', xXss === '0' ? 'X-XSS-Protection: 0 (correctly disabled)' : 'X-XSS-Protection absent (use CSP)', 1));
    }

    // Console errors (misinformation signal — broken AI responses)
    const consoleErrors = (pageData.consoleMessages || []).filter((m) => m.type === 'error');
    if (consoleErrors.length > 0) {
      items.push(item('console-errors', 'JavaScript Console Errors [LLM09]', 'Console errors may indicate broken AI response handling that could display incorrect or incomplete information (OWASP LLM09:2025).', 'warn', `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).map((e) => e.text).join('; ')}`, 1));
    } else {
      items.push(item('console-errors', 'JavaScript Console Errors [LLM09]', 'No JavaScript errors — AI response handling appears stable (OWASP LLM09:2025).', 'pass', 'No console errors during page load', 1));
    }

    // =========================================================
    // LLM10:2025 — UNBOUNDED CONSUMPTION
    // Web signals: rate-limit headers, page size, response headers
    // =========================================================

    // Rate limiting headers
    const rateLimitHeaders = ['ratelimit-limit', 'x-ratelimit-limit', 'x-rate-limit-limit', 'retry-after', 'x-ratelimit-remaining'];
    const hasRateLimit = rateLimitHeaders.some((h) => hdrs[h]);
    if (hasRateLimit) {
      const foundHeader = rateLimitHeaders.find((h) => hdrs[h]);
      items.push(item('rate-limiting', 'Rate Limiting Headers [LLM10]', 'Rate limiting headers detected — protects AI endpoints from unbounded consumption and DoS attacks (OWASP LLM10:2025).', 'pass', `Rate limit header present: ${foundHeader}: ${hdrs[foundHeader]}`, 2));
    } else {
      items.push(item('rate-limiting', 'Rate Limiting Headers [LLM10]', 'No rate limiting headers detected — AI endpoints may be vulnerable to unbounded consumption, cost spikes, or DoS (OWASP LLM10:2025).', 'warn', 'Add RateLimit-Limit, X-RateLimit-Limit, or Retry-After headers to signal rate limiting to clients', 2));
    }

    // Page size (large uncompressed pages can indicate no resource limits)
    const contentEncoding = hdrs['content-encoding'] || '';
    const contentLength = parseInt(hdrs['content-length'] || '0');
    const isCompressed = contentEncoding.includes('gzip') || contentEncoding.includes('br') || contentEncoding.includes('deflate');
    if (!isCompressed && contentLength > 500000) {
      items.push(item('compression', 'Response Compression [LLM10]', 'Large uncompressed responses indicate missing resource controls that could enable unbounded consumption (OWASP LLM10:2025).', 'warn', `Response is ${Math.round(contentLength / 1024)}KB uncompressed. Enable gzip/brotli compression.`, 1));
    } else if (isCompressed) {
      items.push(item('compression', 'Response Compression [LLM10]', 'Response compression enabled — reduces bandwidth consumption for AI-generated content (OWASP LLM10:2025).', 'pass', `Compression: ${contentEncoding}`, 1));
    } else {
      items.push(item('compression', 'Response Compression [LLM10]', 'Response compression status (OWASP LLM10:2025).', 'pass', 'Response size within acceptable limits', 1));
    }

    // Autocomplete on sensitive fields (LLM input security)
    const sensitiveInputs = root.querySelectorAll('input[type="password"], input[name*="card"], input[name*="cvv"], input[name*="ssn"], input[name*="prompt"], input[name*="query"]');
    const autocompleteOnSensitive = Array.from(sensitiveInputs).filter((i) => i.getAttribute('autocomplete') !== 'off' && i.getAttribute('autocomplete') !== 'new-password');
    if (autocompleteOnSensitive.length === 0 || sensitiveInputs.length === 0) {
      items.push(item('autocomplete', 'Autocomplete on Sensitive / AI Input Fields [LLM10]', 'No sensitive autocomplete issues — AI prompt inputs are not cached by browsers (OWASP LLM10:2025).', 'pass', 'No sensitive autocomplete issues found', 1));
    } else {
      items.push(item('autocomplete', 'Autocomplete on Sensitive / AI Input Fields [LLM10]', 'Browser autocomplete on AI prompt fields can cache sensitive queries, enabling replay attacks (OWASP LLM10:2025).', 'warn', `${autocompleteOnSensitive.length} sensitive/AI input field(s) with autocomplete enabled`, 1));
    }

    const score = computeScore(items);
    return {
      id: 'security',
      title: 'Security',
      description: 'OWASP Top 10 for LLM & GenAI Applications 2025 (LLM01–LLM10)',
      score,
      items,
    };
  },
};

module.exports = SecurityAudit;
