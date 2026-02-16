// ============================================================
// INFRASTRUCTURE COST SCANNER
// Pillar 1: What it costs THEM to run
// Uses TinyFish run automation + structured extraction goals
// ============================================================

export class InfraCostScanner {
  constructor(tinyfishClient) {
    this.tinyfish = tinyfishClient;
  }

  async scan(targetUrl, options = {}) {
    const fast = options.fast === true;
    const extractedAt = new Date().toISOString();
    // Ultra-fast: 1 combined run for infra (tech + traffic). Fast: 2 runs. Full: 4 runs.
    const tasks = fast
      ? [this.detectTechStackAndTraffic(targetUrl)]
      : [
          this.detectTechStack(targetUrl),
          this.estimateTraffic(targetUrl),
          this.detectThirdPartyServices(targetUrl),
          this.getEngineeringHeadcount(targetUrl),
        ];
    const results = await Promise.allSettled(tasks);
    if (fast) {
      const combined = results[0]?.status === "fulfilled" ? results[0].value : {};
      const result = {
        techStack: combined.techStack ?? null,
        traffic: combined.traffic ?? null,
        thirdParty: null,
        headcount: null,
      };
      return {
        ...result,
        _meta: this.buildMeta({ pillar: "infra", extractedAt, result }),
      };
    }
    const result = {
      techStack: results[0]?.status === "fulfilled" ? results[0].value : null,
      traffic: results[1]?.status === "fulfilled" ? results[1].value : null,
      thirdParty: results[2]?.status === "fulfilled" ? results[2].value : null,
      headcount: results[3]?.status === "fulfilled" ? results[3].value : null,
    };
    return {
      ...result,
      _meta: this.buildMeta({ pillar: "infra", extractedAt, result }),
    };
  }

  async detectTechStackAndTraffic(url) {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const goal = [
      `Analyze ${domain} and infer infrastructure + traffic signals in one pass.`,
      "Return strict JSON only:",
      "{",
      '  "techStack": {',
      '    "signals": {}, "cloudProvider": {}, "framework": "string", "cdn": "string"',
      "  },",
      '  "traffic": {',
      '    "cloudflareRadar": {}, "similarWeb": {}, "confidence": "high|medium|low", "notes": []',
      "  }",
      "}",
      "Be concise. If uncertain, use conservative values.",
    ].join("\n");
    const response = await this.tinyfish.runJson({ url: url.startsWith("http") ? url : `https://${url}`, goal });
    const raw = this._coerceObject(response.result);
    return {
      techStack: raw.techStack ?? raw,
      traffic: raw.traffic ?? null,
    };
  }

  async detectTechStack(url) {
    const goal = [
      "Analyze this SaaS site and infer infrastructure/tech stack signals.",
      "Return strict JSON only:",
      "{",
      '  "signals": {',
      '    "headers": {},',
      '    "scripts": [],',
      '    "globals": {},',
      '    "dom": {},',
      '    "networkNotes": []',
      "  },",
      '  "cloudProvider": { "provider": "string", "confidence": "high|medium|low" },',
      '  "detectedServices": {},',
      '  "framework": "string",',
      '  "cdn": "string"',
      "}",
      "If uncertain, keep values conservative and explicit.",
    ].join("\n");

    const response = await this.tinyfish.runJson({ url, goal });
    return this._coerceObject(response.result);
  }

  async estimateTraffic(url) {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const goal = [
      `Estimate traffic and engagement signals for ${domain}.`,
      "Use available public signals on the target site and major traffic-intel sources.",
      "Return strict JSON only:",
      "{",
      '  "cloudflareRadar": { "rank": "string|null", "traffic": "string|null", "pageText": "string|null" },',
      '  "similarWeb": { "visits": "string|null", "bounce": "string|null", "duration": "string|null", "pages": "string|null" },',
      '  "confidence": "high|medium|low",',
      '  "notes": []',
      "}",
    ].join("\n");

    const response = await this.tinyfish.runJson({ url: `https://${domain}`, goal });
    return this._coerceObject(response.result);
  }

  async detectThirdPartyServices(url) {
    const goal = [
      "Identify third-party services and classify them by category.",
      "Focus on analytics, monitoring, support, billing, feature_flags, cdn, ads_social, auth, other.",
      "Return strict JSON only as an array:",
      '[{ "host": "string", "count": number, "totalSize": number, "types": [], "category": "string" }]',
    ].join("\n");

    const response = await this.tinyfish.runJson({ url, goal });
    const result = response.result;
    return Array.isArray(result) ? result : [];
  }

  async getEngineeringHeadcount(url) {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const companyName = domain.split(".")[0];
    const goal = [
      `Estimate engineering headcount and salary signals for company "${companyName}".`,
      "Use public profile and compensation signals when available.",
      "Return strict JSON only:",
      "{",
      '  "engineeringCount": "number|null",',
      '  "rawText": "string|null",',
      '  "salaries": [{ "title": "string|null", "salary": "string|null" }]',
      "}",
    ].join("\n");

    const response = await this.tinyfish.runJson({ url: `https://${domain}`, goal });
    return this._coerceObject(response.result);
  }

  _coerceObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    return {};
  }

  buildMeta({ pillar, extractedAt, result }) {
    const sourceFamilies = [];
    if (this._hasDataObject(result?.techStack)) sourceFamilies.push("techStack");
    if (this._hasDataObject(result?.traffic)) sourceFamilies.push("trafficSignals");
    if (Array.isArray(result?.thirdParty) && result.thirdParty.length > 0) sourceFamilies.push("thirdParty");
    if (this._hasDataObject(result?.headcount)) sourceFamilies.push("headcount");
    return {
      pillar,
      extractedAt,
      sourceFamilies,
      sourceCount: sourceFamilies.length,
    };
  }

  _hasDataObject(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    );
  }
}
