// ============================================================
// BUILD COST ESTIMATOR
// Pillar 2: What it would cost to BUILD from scratch
// Uses TinyFish run automation + structured extraction goals
// ============================================================

export class BuildCostEstimator {
  constructor(tinyfishClient) {
    this.tinyfish = tinyfishClient;
  }

  async scan(targetUrl, options = {}) {
    const fast = options.fast === true;
    const extractedAt = new Date().toISOString();
    const tasks = fast
      ? [this.detectFeatures(targetUrl)]
      : [this.detectFeatures(targetUrl), this.findOpenSourceComponents(targetUrl), this.getHiringCosts(targetUrl)];
    const results = await Promise.allSettled(tasks);
    const result = {
      features: results[0]?.status === "fulfilled" ? results[0].value : [],
      openSource: !fast && results[1]?.status === "fulfilled" ? results[1].value : [],
      hiring: !fast && results[2]?.status === "fulfilled" ? results[2].value : null,
    };
    return {
      ...result,
      _meta: this.buildMeta({ pillar: "build", extractedAt, result }),
    };
  }

  async detectFeatures(url) {
    const goal = [
      "Analyze the product site and return detected build-relevant features.",
      "Output strict JSON only:",
      "{",
      '  "detected": [{ "name": "string", "complexity": "extreme|hard|medium", "evidence": "string" }],',
      '  "pricingPageFeatures": ["string"]',
      "}",
    ].join("\n");

    const response = await this.tinyfish.runJson({ url, goal });
    return this._coerceObject(response.result, { detected: [], pricingPageFeatures: [] });
  }

  async findOpenSourceComponents(url) {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const companyName = domain.split(".")[0];
    const goal = [
      `Find likely open-source components or repositories linked to ${companyName}.`,
      "Return strict JSON only as an array:",
      '[{ "name": "string|null", "url": "string|null" }]',
    ].join("\n");

    const response = await this.tinyfish.runJson({ url, goal });
    const result = response.result;
    return Array.isArray(result) ? result : [];
  }

  async getHiringCosts(url) {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    const companyName = domain.split(".")[0];
    const goal = [
      `Estimate hiring and compensation benchmarks for ${companyName} engineering roles.`,
      "Return strict JSON only:",
      "{",
      '  "levels": [{ "level": "string|null", "title": "string|null", "totalComp": "string|null" }],',
      '  "notes": []',
      "}",
    ].join("\n");

    const response = await this.tinyfish.runJson({ url: `https://${domain}`, goal });
    return this._coerceObject(response.result, { levels: [], notes: [] });
  }

  _coerceObject(value, fallback) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    return fallback;
  }

  buildMeta({ pillar, extractedAt, result }) {
    const sourceFamilies = [];
    if (result?.features?.detected?.length || result?.features?.pricingPageFeatures?.length) sourceFamilies.push("features");
    if (Array.isArray(result?.openSource) && result.openSource.length > 0) sourceFamilies.push("openSource");
    if (this._hasDataObject(result?.hiring)) sourceFamilies.push("hiringBenchmarks");
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
