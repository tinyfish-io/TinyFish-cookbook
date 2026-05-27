// ============================================================
// TECHNOLOGY RISK SCANNER
// Pillar 4: Security, privacy, and compliance signals
// Uses TinyFish run automation + structured extraction goals
// ============================================================

export class TechRiskScanner {
  constructor(tinyfishClient) {
    this.tinyfish = tinyfishClient;
  }

  async scan(targetUrl, options = {}) {
    const fast = options.fast === true;
    const extractedAt = new Date().toISOString();
    const domain = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`).hostname;

    const tasks = fast
      ? [this.scanCombined(targetUrl, domain)]
      : [
          this.scanSecurityHeaders(targetUrl, domain),
          this.scanPrivacyCompliance(targetUrl, domain),
          this.scanThirdPartyTrackers(targetUrl, domain),
        ];

    const results = await Promise.allSettled(tasks);

    if (fast) {
      const combined = results[0]?.status === "fulfilled" ? results[0].value : {};
      const result = {
        securityHeaders: combined.securityHeaders ?? null,
        privacyCompliance: combined.privacyCompliance ?? null,
        trackers: combined.trackers ?? [],
      };
      result._meta = this.buildMeta(result, extractedAt);
      return result;
    }

    const securityHeaders = results[0]?.status === "fulfilled" ? results[0].value : null;
    const privacyCompliance = results[1]?.status === "fulfilled" ? results[1].value : null;
    const trackers = results[2]?.status === "fulfilled" ? results[2].value : [];

    const result = { securityHeaders, privacyCompliance, trackers };
    result._meta = this.buildMeta(result, extractedAt);
    return result;
  }

  async scanCombined(targetUrl, domain) {
    return this.tinyfish.runJson({
      url: targetUrl,
      goal: `Analyze ${domain} for security and compliance signals in one pass.
Return strict JSON only:
{
  "securityHeaders": {
    "https": true/false,
    "hsts": true/false,
    "csp": true/false,
    "xFrameOptions": "string|null",
    "xContentTypeOptions": true/false,
    "cookieFlags": ["string"]
  },
  "privacyCompliance": {
    "privacyPolicyUrl": "string|null",
    "termsUrl": "string|null",
    "complianceBadges": ["SOC2", "GDPR", "HIPAA", "ISO27001"],
    "cookieConsent": true/false
  },
  "trackers": [{ "tracker": "string", "category": "analytics|advertising|social|functional|other", "dataShared": "string" }]
}
Be conservative. Only list compliance badges if you find evidence on the site.`,
    });
  }

  async scanSecurityHeaders(targetUrl, domain) {
    return this.tinyfish.runJson({
      url: targetUrl,
      goal: `Analyze security headers, HTTPS configuration, CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and cookie flags for ${domain}.
Return strict JSON only:
{
  "https": true/false,
  "hsts": true/false,
  "csp": true/false,
  "xFrameOptions": "string|null",
  "xContentTypeOptions": true/false,
  "cookieFlags": ["HttpOnly", "Secure", "SameSite"],
  "notes": ["string"]
}`,
    });
  }

  async scanPrivacyCompliance(targetUrl, domain) {
    return this.tinyfish.runJson({
      url: targetUrl,
      goal: `Find privacy policy, terms of service, and compliance badges (SOC2, GDPR, HIPAA, ISO27001) on ${domain}. Check for cookie consent banners.
Return strict JSON only:
{
  "privacyPolicyUrl": "string|null",
  "termsUrl": "string|null",
  "complianceBadges": ["string"],
  "cookieConsent": true/false,
  "dataProcessingInfo": "string|null"
}
Only include compliance badges that are explicitly mentioned or displayed on the site.`,
    });
  }

  async scanThirdPartyTrackers(targetUrl, domain) {
    return this.tinyfish.runJson({
      url: targetUrl,
      goal: `Identify all third-party trackers, analytics scripts, and data-sharing integrations on ${domain}.
Return strict JSON only as an array:
[{ "tracker": "string", "category": "analytics|advertising|social|functional|other", "dataShared": "string" }]`,
    });
  }

  buildMeta(result, extractedAt) {
    const sourceFamilies = [];
    if (this._hasData(result?.securityHeaders)) sourceFamilies.push("securityHeaders");
    if (this._hasData(result?.privacyCompliance)) sourceFamilies.push("privacyCompliance");
    if (Array.isArray(result?.trackers) && result.trackers.length > 0) sourceFamilies.push("trackers");
    return {
      extractedAt,
      sourceFamilies,
      sourceCount: sourceFamilies.length,
    };
  }

  _hasData(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    );
  }
}
