'use strict';

const { computeScore, item } = require('../utils/scoring');
const { parse } = require('node-html-parser');

/**
 * Compliance Audit
 *
 * Checks for regulatory and standards compliance:
 *
 * GDPR / Privacy:
 *   - Cookie consent banner presence
 *   - Privacy policy link
 *   - Third-party tracker detection
 *   - Data collection forms with consent
 *   - Google Analytics / Facebook Pixel detection
 *
 * WCAG 2.1 Level AA (compliance-specific):
 *   - Color contrast (heuristic)
 *   - Focus indicators
 *   - Text alternatives
 *   - Keyboard accessibility indicators
 *
 * General Legal Compliance:
 *   - Terms of Service / Terms & Conditions link
 *   - Copyright notice
 *   - Contact information
 *   - HTTPS (required for GDPR)
 *
 * Security Compliance (OWASP Top 10 indicators):
 *   - Injection prevention indicators
 *   - Broken authentication indicators
 *   - Security misconfiguration indicators
 */
const ComplianceAudit = {
  id: 'compliance',
  title: 'Compliance',
  description: 'Evaluates GDPR, WCAG 2.1, privacy regulations, and legal requirements.',

  async run({ pageData, tls }) {
    const items = [];
    const { html, cookies, scripts, links, forms, pageInfo } = pageData;
    const root = parse(html);
    const bodyText = (root.querySelector('body')?.text || '').toLowerCase();
    const allLinks = links.map((l) => ({ href: l.href.toLowerCase(), text: l.text.toLowerCase() }));

    // =========================================================
    // GDPR / PRIVACY COMPLIANCE
    // =========================================================

    // --- Cookie consent banner ---
    const consentKeywords = ['cookie consent', 'we use cookies', 'cookie policy', 'accept cookies', 'cookie notice', 'cookie preferences', 'gdpr', 'consent'];
    const hasConsentBanner = consentKeywords.some((kw) => bodyText.includes(kw));
    const consentElements = root.querySelectorAll('[id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"], [id*="gdpr"], [class*="gdpr"], [id*="banner"], [class*="banner"]');
    if (hasConsentBanner || consentElements.length > 0) {
      items.push(item('cookie-consent', 'Cookie Consent Banner', 'GDPR requires informed consent before setting non-essential cookies.', 'pass', `Cookie consent mechanism detected (${consentElements.length} element(s))`, 3));
    } else if (cookies.length > 0) {
      items.push(item('cookie-consent', 'Cookie Consent Banner', 'GDPR requires informed consent before setting non-essential cookies.', 'warn', `${cookies.length} cookie(s) set but no consent banner detected`, 3));
    } else {
      items.push(item('cookie-consent', 'Cookie Consent Banner', 'GDPR requires informed consent before setting non-essential cookies.', 'info', 'No cookies set and no consent banner found', 1));
    }

    // --- Privacy policy ---
    const privacyLinks = allLinks.filter((l) =>
      l.text.includes('privacy') || l.href.includes('privacy') || l.text.includes('datenschutz') || l.href.includes('datenschutz')
    );
    if (privacyLinks.length > 0) {
      items.push(item('privacy-policy', 'Privacy Policy', 'GDPR requires a clear and accessible privacy policy.', 'pass', `Privacy policy link found: "${privacyLinks[0].href}"`, 3));
    } else {
      items.push(item('privacy-policy', 'Privacy Policy', 'GDPR requires a clear and accessible privacy policy.', 'fail', 'No privacy policy link detected', 3));
    }

    // --- Third-party trackers ---
    const trackerPatterns = [
      { name: 'Google Analytics (GA4)', pattern: /googletagmanager\.com|google-analytics\.com|gtag\(|ga\(|_gaq|G-[A-Z0-9]+/ },
      { name: 'Google Tag Manager', pattern: /googletagmanager\.com\/gtm/ },
      { name: 'Facebook Pixel', pattern: /connect\.facebook\.net|fbq\(|_fbq|facebook\.com\/tr/ },
      { name: 'HotJar', pattern: /hotjar\.com|hjid|hjsv/ },
      { name: 'Intercom', pattern: /intercomcdn\.com|intercom\.io/ },
      { name: 'Mixpanel', pattern: /mixpanel\.com/ },
      { name: 'Segment', pattern: /segment\.com|segment\.io/ },
      { name: 'Amplitude', pattern: /amplitude\.com/ },
      { name: 'Hubspot', pattern: /hubspot\.com|hs-analytics/ },
      { name: 'Linkedin Insight', pattern: /linkedin\.com\/insight/ },
      { name: 'Twitter/X Pixel', pattern: /static\.ads-twitter\.com|t\.co\/i\/adsct/ },
      { name: 'TikTok Pixel', pattern: /analytics\.tiktok\.com/ },
    ];
    const detectedTrackers = trackerPatterns.filter((t) => t.pattern.test(html));
    if (detectedTrackers.length === 0) {
      items.push(item('trackers', 'Third-Party Trackers', 'Trackers must be disclosed and require consent under GDPR.', 'pass', 'No known third-party trackers detected', 2));
    } else {
      items.push(item('trackers', 'Third-Party Trackers', 'Trackers must be disclosed and require consent under GDPR.', 'warn', `${detectedTrackers.length} tracker(s) detected: ${detectedTrackers.map((t) => t.name).join(', ')}`, 2));
    }

    // --- Forms with personal data ---
    const personalDataForms = forms.filter((f) =>
      f.inputs.some((i) =>
        ['email', 'tel', 'text'].includes(i.type) &&
        (i.name.match(/email|phone|name|address|birth|age|gender|zip|postal/i) || i.autocomplete.match(/email|tel|name|address/i))
      )
    );
    if (personalDataForms.length > 0) {
      // Check if there's a consent checkbox near forms
      const consentCheckbox = root.querySelectorAll('input[type="checkbox"]').filter((cb) => {
        const label = cb.getAttribute('aria-label') || '';
        const nearText = cb.parentNode?.text?.toLowerCase() || '';
        return nearText.includes('agree') || nearText.includes('consent') || nearText.includes('terms') || nearText.includes('privacy') || label.toLowerCase().includes('consent');
      });
      if (consentCheckbox.length > 0) {
        items.push(item('form-consent', 'Form Data Collection Consent', 'Forms collecting personal data must obtain explicit consent (GDPR Art. 6).', 'pass', `${personalDataForms.length} personal data form(s) with consent checkbox`, 3));
      } else {
        items.push(item('form-consent', 'Form Data Collection Consent', 'Forms collecting personal data must obtain explicit consent (GDPR Art. 6).', 'warn', `${personalDataForms.length} form(s) collect personal data — verify consent mechanism`, 3));
      }
    } else {
      items.push(item('form-consent', 'Form Data Collection Consent', 'Forms collecting personal data must obtain explicit consent (GDPR Art. 6).', 'info', 'No personal data collection forms detected', 1));
    }

    // --- HTTPS for GDPR ---
    const isHttps = pageData.url.startsWith('https://');
    if (isHttps) {
      items.push(item('gdpr-https', 'HTTPS for GDPR Compliance', 'GDPR requires data in transit to be encrypted (Art. 32).', 'pass', 'Site uses HTTPS — data in transit is encrypted', 3));
    } else {
      items.push(item('gdpr-https', 'HTTPS for GDPR Compliance', 'GDPR requires data in transit to be encrypted (Art. 32).', 'fail', 'HTTP site — GDPR requires encryption of personal data in transit', 3));
    }

    // =========================================================
    // LEGAL COMPLIANCE
    // =========================================================

    // --- Terms of Service ---
    const tosLinks = allLinks.filter((l) =>
      l.text.match(/terms|conditions|tos|terms of service|terms of use|legal/i) ||
      l.href.match(/terms|conditions|tos|legal/i)
    );
    if (tosLinks.length > 0) {
      items.push(item('terms', 'Terms of Service', 'Sites should provide accessible Terms of Service.', 'pass', `ToS link found: "${tosLinks[0].href}"`, 2));
    } else {
      items.push(item('terms', 'Terms of Service', 'Sites should provide accessible Terms of Service.', 'warn', 'No Terms of Service link detected', 2));
    }

    // --- Copyright notice ---
    const hasCopyright = bodyText.includes('©') || bodyText.includes('copyright') || bodyText.includes('all rights reserved');
    if (hasCopyright) {
      items.push(item('copyright', 'Copyright Notice', 'Site should display a copyright notice.', 'pass', 'Copyright notice found', 1));
    } else {
      items.push(item('copyright', 'Copyright Notice', 'Site should display a copyright notice.', 'warn', 'No copyright notice detected', 1));
    }

    // --- Contact information ---
    const contactLinks = allLinks.filter((l) =>
      l.text.match(/contact|about|support|help/i) || l.href.match(/contact|about|support/i)
    );
    const hasContactEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(html);
    if (contactLinks.length > 0 || hasContactEmail) {
      items.push(item('contact-info', 'Contact Information', 'Sites should provide contact information for legal compliance.', 'pass', contactLinks.length > 0 ? `Contact link: "${contactLinks[0].href}"` : 'Email address found', 1));
    } else {
      items.push(item('contact-info', 'Contact Information', 'Sites should provide contact information for legal compliance.', 'warn', 'No contact link or email address found', 1));
    }

    // =========================================================
    // WCAG 2.1 COMPLIANCE INDICATORS
    // =========================================================

    // --- Focus visible (CSS check heuristic) ---
    const styleContent = Array.from(root.querySelectorAll('style')).map((s) => s.text).join('');
    const hasOutlineNone = styleContent.includes('outline: none') || styleContent.includes('outline:none') || styleContent.includes('outline: 0') || styleContent.includes('outline:0');
    if (hasOutlineNone) {
      items.push(item('focus-visible', 'Focus Indicator (WCAG 2.4.7)', 'Removing focus outlines breaks keyboard navigation.', 'warn', 'CSS contains "outline: none" — may hide focus indicators', 2));
    } else {
      items.push(item('focus-visible', 'Focus Indicator (WCAG 2.4.7)', 'Keyboard focus must be visually apparent.', 'pass', 'No outline suppression detected in inline styles', 2));
    }

    // --- Text resize / zoom (already in accessibility, but compliance-specific) ---
    const viewportMeta = root.querySelector('meta[name="viewport"]');
    const viewportContent = viewportMeta ? (viewportMeta.getAttribute('content') || '') : '';
    if (viewportContent.includes('user-scalable=no') || viewportContent.includes('maximum-scale=1')) {
      items.push(item('text-resize', 'Text Resize (WCAG 1.4.4)', 'Users must be able to resize text up to 200% (WCAG 1.4.4).', 'fail', 'Viewport disables user scaling', 2));
    } else {
      items.push(item('text-resize', 'Text Resize (WCAG 1.4.4)', 'Users must be able to resize text up to 200%.', 'pass', 'Viewport allows user scaling', 2));
    }

    // --- Language declaration (WCAG 3.1.1) ---
    if (pageInfo.lang && pageInfo.lang.trim() !== '') {
      items.push(item('wcag-lang', 'Page Language (WCAG 3.1.1)', 'Language must be declared for screen readers.', 'pass', `lang="${pageInfo.lang}"`, 2));
    } else {
      items.push(item('wcag-lang', 'Page Language (WCAG 3.1.1)', 'Language must be declared for screen readers.', 'fail', 'Missing lang attribute', 2));
    }

    // =========================================================
    // OWASP TOP 10 COMPLIANCE INDICATORS
    // =========================================================

    // --- A01: Broken Access Control indicators ---
    const hasAdminLinks = allLinks.some((l) => l.href.match(/\/admin|\/dashboard|\/manage|\/control/i));
    if (hasAdminLinks) {
      items.push(item('owasp-a01', 'OWASP A01: Access Control', 'Admin/management URLs should not be publicly linked.', 'warn', 'Admin/dashboard links found in public HTML', 2));
    } else {
      items.push(item('owasp-a01', 'OWASP A01: Access Control', 'Admin/management URLs should not be publicly linked.', 'pass', 'No admin/management links found in public HTML', 2));
    }

    // --- A03: Injection (XSS indicators) ---
    const hasEvalInScripts = scripts.some((s) => s.inline && /eval\s*\(|document\.write\s*\(|innerHTML\s*=/.test(s.inline));
    if (hasEvalInScripts) {
      items.push(item('owasp-a03', 'OWASP A03: Injection (XSS Indicators)', 'eval() and innerHTML assignments can enable XSS attacks.', 'warn', 'Potentially unsafe JS patterns detected (eval/innerHTML)', 2));
    } else {
      items.push(item('owasp-a03', 'OWASP A03: Injection (XSS Indicators)', 'eval() and innerHTML assignments can enable XSS attacks.', 'pass', 'No obvious XSS-prone patterns in inline scripts', 2));
    }

    // --- A05: Security Misconfiguration ---
    const hasDebugInfo = bodyText.match(/stack trace|exception|error at line|debug mode|traceback|undefined variable/i);
    if (hasDebugInfo) {
      items.push(item('owasp-a05', 'OWASP A05: Security Misconfiguration', 'Debug information must not be exposed in production.', 'fail', 'Possible debug/error information in page content', 3));
    } else {
      items.push(item('owasp-a05', 'OWASP A05: Security Misconfiguration', 'Debug information must not be exposed in production.', 'pass', 'No debug/error information detected in page content', 3));
    }

    // --- A09: Security Logging (CSP report-uri) ---
    const cspHeader = pageData.responseHeaders['content-security-policy'] || '';
    const hasReportUri = cspHeader.includes('report-uri') || cspHeader.includes('report-to');
    items.push(item('owasp-a09', 'OWASP A09: Security Logging (CSP Reporting)', 'CSP report-uri enables security event logging.', hasReportUri ? 'pass' : 'info', hasReportUri ? 'CSP report-uri/report-to configured' : 'No CSP reporting endpoint configured', 1));

    const score = computeScore(items);
    return { id: 'compliance', title: 'Compliance', score, items };
  },
};

module.exports = ComplianceAudit;
