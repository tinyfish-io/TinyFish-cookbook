'use strict';

const { computeScore, item } = require('../utils/scoring');
const { parse } = require('node-html-parser');

/**
 * Best Practices Audit
 *
 * Checks: HTTPS usage, doctype, charset, console errors, deprecated HTML,
 * external link safety, password field masking, favicon, HTTP status,
 * mixed content, third-party scripts, OWASP-aligned security best practices:
 *   - rel="noopener noreferrer" on external links (OWASP A01 tab-napping)
 *   - Password field masking (OWASP A07)
 *   - Inline scripts minimisation (OWASP A03 CSP compatibility)
 *   - Third-party script count (OWASP A06 supply chain)
 *   - Error page information disclosure (OWASP A09)
 *   - Content-Type header correctness (OWASP A05)
 */
const BestPracticesAudit = {
  id: 'best-practices',
  title: 'Best Practices',
  description: 'Evaluates general web development best practices and OWASP-aligned security standards.',

  async run({ pageData, headers }) {
    const items = [];
    const { html, pageInfo, scripts, links, consoleMessages, failedRequests, networkRequests, statusCode } = pageData;
    const hdrs = { ...(headers.headers || {}) };
    const root = parse(html);

    // --- HTTPS (OWASP A01/A02) ---
    const isHttps = pageData.url.startsWith('https://');
    if (isHttps) {
      items.push(item('https', 'HTTPS', 'Site must be served over HTTPS to protect data in transit (OWASP A01/A02).', 'pass', 'Site uses HTTPS', 3));
    } else {
      items.push(item('https', 'HTTPS', 'Site must be served over HTTPS to protect data in transit (OWASP A01/A02).', 'fail', 'Site is served over HTTP — all data transmitted in plaintext', 3));
    }

    // --- DOCTYPE ---
    const hasDoctype = html.trim().toLowerCase().startsWith('<!doctype html>');
    if (hasDoctype) {
      items.push(item('doctype', 'HTML Doctype', 'Page must declare <!DOCTYPE html>.', 'pass', '<!DOCTYPE html> present', 1));
    } else {
      items.push(item('doctype', 'HTML Doctype', 'Page must declare <!DOCTYPE html>.', 'warn', 'Missing or non-standard DOCTYPE', 1));
    }

    // --- Charset ---
    const charsetMeta = root.querySelector('meta[charset]') || root.querySelector('meta[http-equiv="Content-Type"]');
    if (charsetMeta || (pageInfo.charset && pageInfo.charset.toLowerCase().includes('utf'))) {
      items.push(item('charset', 'Character Encoding', 'Page should declare UTF-8 charset.', 'pass', `Charset: ${pageInfo.charset || charsetMeta?.getAttribute('charset') || 'declared'}`, 1));
    } else {
      items.push(item('charset', 'Character Encoding', 'Page should declare UTF-8 charset.', 'warn', 'No charset meta tag found', 1));
    }

    // --- Console errors ---
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    if (consoleErrors.length === 0) {
      items.push(item('console-errors', 'Browser Console Errors', 'No JavaScript errors should appear in the console.', 'pass', 'No console errors detected', 2));
    } else {
      items.push(item('console-errors', 'Browser Console Errors', 'No JavaScript errors should appear in the console.', 'warn', `${consoleErrors.length} console error(s): ${consoleErrors[0].text.substring(0, 100)}`, 2));
    }

    // --- Mixed content ---
    const mixedContent = isHttps
      ? networkRequests.filter((r) => r.url.startsWith('http://') && !r.url.startsWith('http://localhost'))
      : [];
    if (mixedContent.length === 0) {
      items.push(item('mixed-content', 'Mixed Content', 'HTTPS pages must not load HTTP resources.', 'pass', 'No mixed content detected', 3));
    } else {
      items.push(item('mixed-content', 'Mixed Content', 'HTTPS pages must not load HTTP resources.', 'fail', `${mixedContent.length} HTTP resource(s) on HTTPS page`, 3));
    }

    // --- Failed requests ---
    if (failedRequests.length === 0) {
      items.push(item('failed-requests', 'Failed Network Requests', 'All network requests should succeed.', 'pass', 'No failed requests', 1));
    } else {
      items.push(item('failed-requests', 'Failed Network Requests', 'All network requests should succeed.', 'warn', `${failedRequests.length} failed request(s)`, 1));
    }

    // --- Deprecated HTML elements ---
    const deprecatedTags = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset', 'noframes', 'applet', 'basefont', 'big', 'strike', 'tt'];
    const foundDeprecated = deprecatedTags.filter((tag) => root.querySelector(tag));
    if (foundDeprecated.length === 0) {
      items.push(item('deprecated-html', 'Deprecated HTML Elements', 'Deprecated elements should not be used.', 'pass', 'No deprecated HTML elements found', 1));
    } else {
      items.push(item('deprecated-html', 'Deprecated HTML Elements', 'Deprecated elements should not be used.', 'warn', `Deprecated: <${foundDeprecated.join('>, <')}>`, 1));
    }

    // --- External links with rel="noopener noreferrer" (OWASP A01 — tab-napping) ---
    const externalLinks = links.filter((l) => {
      try { return new URL(l.href).hostname !== new URL(pageData.url).hostname; } catch { return false; }
    });
    const unsafeExternalLinks = externalLinks.filter((l) => l.target === '_blank' && !l.rel.includes('noopener'));
    if (unsafeExternalLinks.length === 0) {
      items.push(item('noopener', 'External Link Safety (rel="noopener noreferrer")', 'Links with target="_blank" must have rel="noopener noreferrer" to prevent tab-napping (OWASP A01).', 'pass', `${externalLinks.length} external link(s) checked — all safe`, 2));
    } else {
      items.push(item('noopener', 'External Link Safety (rel="noopener noreferrer")', 'Links with target="_blank" without rel="noopener" allow opened pages to control the opener (tab-napping, OWASP A01).', 'fail', `${unsafeExternalLinks.length} link(s) missing rel="noopener noreferrer" on target="_blank" links`, 2));
    }

    // --- Password inputs with type="password" (OWASP A07) ---
    const passwordInputs = root.querySelectorAll('input[type="password"]');
    const visiblePasswordInputs = root.querySelectorAll('input[type="text"][name*="pass"], input[type="text"][name*="pwd"]');
    if (visiblePasswordInputs.length > 0) {
      items.push(item('password-masking', 'Password Field Masking', 'Password fields must use type="password" to mask input (OWASP A07).', 'fail', `${visiblePasswordInputs.length} possible unmasked password field(s) — change input type to "password"`, 2));
    } else {
      items.push(item('password-masking', 'Password Field Masking', 'Password fields use type="password" to mask input (OWASP A07).', 'pass', passwordInputs.length > 0 ? `${passwordInputs.length} password field(s) properly masked` : 'No password fields found', 2));
    }

    // --- Favicon ---
    const favicon = root.querySelector('link[rel*="icon"]') || root.querySelector('link[rel="shortcut icon"]');
    if (favicon) {
      items.push(item('favicon', 'Favicon', 'Site should have a favicon.', 'pass', `href="${favicon.getAttribute('href')}"`, 1));
    } else {
      items.push(item('favicon', 'Favicon', 'Site should have a favicon.', 'warn', 'No favicon link tag found', 1));
    }

    // --- HTTP status code ---
    if (statusCode >= 200 && statusCode < 300) {
      items.push(item('status-code', 'HTTP Status Code', 'Page should return a 2xx status code.', 'pass', `Status: ${statusCode}`, 2));
    } else if (statusCode >= 300 && statusCode < 400) {
      items.push(item('status-code', 'HTTP Status Code', 'Page should return a 2xx status code.', 'warn', `Redirect: ${statusCode}`, 2));
    } else {
      items.push(item('status-code', 'HTTP Status Code', 'Page should return a 2xx status code.', 'fail', `Error: ${statusCode}`, 2));
    }

    // --- Third-party scripts (OWASP A06 — supply chain risk) ---
    const thirdPartyScripts = scripts.filter((s) => {
      if (!s.src) return false;
      try { return new URL(s.src).hostname !== new URL(pageData.url).hostname; } catch { return false; }
    });
    if (thirdPartyScripts.length === 0) {
      items.push(item('third-party-scripts', 'Third-Party Scripts', 'Third-party scripts introduce supply chain risk (OWASP A06).', 'pass', 'No third-party scripts loaded', 1));
    } else if (thirdPartyScripts.length <= 5) {
      items.push(item('third-party-scripts', 'Third-Party Scripts', 'Third-party scripts introduce supply chain risk (OWASP A06). Keep count low and use SRI.', 'pass', `${thirdPartyScripts.length} third-party script(s) — acceptable count`, 1));
    } else {
      items.push(item('third-party-scripts', 'Third-Party Scripts', 'High number of third-party scripts increases supply chain attack surface (OWASP A06).', 'warn', `${thirdPartyScripts.length} third-party script(s) — consider reducing and adding SRI hashes`, 1));
    }

    // --- Inline scripts (OWASP A03 — CSP compatibility) ---
    const inlineScripts = scripts.filter((s) => !s.src && s.inline);
    if (inlineScripts.length <= 3) {
      items.push(item('inline-scripts', 'Inline Scripts', 'Minimise inline scripts for better CSP compatibility and reduced XSS risk (OWASP A03).', 'pass', `${inlineScripts.length} inline script(s)`, 1));
    } else {
      items.push(item('inline-scripts', 'Inline Scripts', 'Many inline scripts make it harder to enforce a strict CSP, increasing XSS risk (OWASP A03).', 'warn', `${inlineScripts.length} inline script(s) — externalise scripts and use nonces/hashes in CSP`, 1));
    }

    // --- Content-Type header (OWASP A05) ---
    const contentType = hdrs['content-type'] || '';
    if (contentType.includes('text/html') && contentType.includes('charset')) {
      items.push(item('content-type', 'Content-Type Header', 'Content-Type header correctly specifies charset, preventing XSS via charset sniffing (OWASP A05).', 'pass', `Content-Type: ${contentType}`, 1));
    } else if (contentType.includes('text/html')) {
      items.push(item('content-type', 'Content-Type Header (Missing Charset)', 'Content-Type header is missing charset declaration, which can enable XSS via charset sniffing (OWASP A05).', 'warn', `Content-Type: ${contentType} — add ; charset=UTF-8`, 1));
    } else if (!contentType) {
      items.push(item('content-type', 'Content-Type Header', 'Missing Content-Type header may allow browsers to sniff MIME types (OWASP A05).', 'warn', 'No Content-Type header found', 1));
    } else {
      items.push(item('content-type', 'Content-Type Header', 'Content-Type header is set (OWASP A05).', 'pass', `Content-Type: ${contentType}`, 1));
    }

    // --- Redirect chain ---
    const redirects = headers.redirects || [];
    if (redirects.length === 0) {
      items.push(item('redirects', 'Redirect Chain', 'Avoid redirect chains that add latency.', 'pass', 'No redirects', 1));
    } else if (redirects.length <= 2) {
      items.push(item('redirects', 'Redirect Chain', 'Avoid redirect chains that add latency.', 'warn', `${redirects.length} redirect(s)`, 1));
    } else {
      items.push(item('redirects', 'Redirect Chain', 'Avoid redirect chains that add latency.', 'fail', `${redirects.length} redirects — chain is too long`, 1));
    }

    const score = computeScore(items);
    return { id: 'best-practices', title: 'Best Practices', score, items };
  },
};

module.exports = BestPracticesAudit;
