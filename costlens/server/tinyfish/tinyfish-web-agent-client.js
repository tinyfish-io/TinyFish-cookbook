// ============================================================
// TINYFISH WEB AGENT CLIENT — CostLens Edition
// Official run-sse based automation integration
// ============================================================

const TINYFISH_PROXY_COUNTRY_CODES = ["US", "GB", "CA", "DE", "FR", "JP", "AU"];

export class TinyFishWebAgentClient {
  constructor(config) {
    this.endpoint = (config.endpoint || "https://agent.tinyfish.ai").replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.retries = config.retryAttempts || 3;
    this.requestTimeoutMs = Number(config.requestTimeoutMs) || 25000;
    this.sseTimeoutMs = Number(config.sseTimeoutMs) || 130000;
    this.browserProfile = config.browserProfile || "stealth";
    const countryCode =
      config.proxyCountryCode && TINYFISH_PROXY_COUNTRY_CODES.includes(config.proxyCountryCode.toUpperCase())
        ? config.proxyCountryCode.toUpperCase()
        : null;
    this.proxyConfig = config.proxyEnabled
      ? {
          enabled: true,
          ...(countryCode ? { country_code: countryCode } : {}),
        }
      : null;
  }

  async runAutomation({ url, goal, browserProfile, proxyConfig, onEvent }) {
    if (!this.apiKey) {
      throw new Error("Missing TinyFish API key. Set TINYFISH_API_KEY.");
    }
    const payload = {
      url,
      goal,
      browser_profile: browserProfile || this.browserProfile,
      ...(proxyConfig || this.proxyConfig ? { proxy_config: proxyConfig || this.proxyConfig } : {}),
    };

    let lastErr;
    for (let i = 0; i < this.retries; i++) {
      try {
        return await this._runSse(payload, onEvent);
      } catch (err) {
        lastErr = err;
        if (!this._isRetryable(err)) break;
        if (i < this.retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
        }
      }
    }
    throw lastErr;
  }

  async runJson({ url, goal, browserProfile, proxyConfig, onEvent }) {
    const completed = await this.runAutomation({ url, goal, browserProfile, proxyConfig, onEvent });
    return this._normalizeCompletePayload(completed);
  }

  async runSync({ url, goal, browserProfile, proxyConfig }) {
    if (!this.apiKey) {
      throw new Error("Missing TinyFish API key. Set TINYFISH_API_KEY.");
    }
    const payload = {
      url,
      goal,
      browser_profile: browserProfile || this.browserProfile,
      ...(proxyConfig || this.proxyConfig ? { proxy_config: proxyConfig || this.proxyConfig } : {}),
    };
    return this._reqJson("POST", "/v1/automation/run", payload);
  }

  async runAsync({ url, goal, browserProfile, proxyConfig }) {
    if (!this.apiKey) {
      throw new Error("Missing TinyFish API key. Set TINYFISH_API_KEY.");
    }
    const payload = {
      url,
      goal,
      browser_profile: browserProfile || this.browserProfile,
      ...(proxyConfig || this.proxyConfig ? { proxy_config: proxyConfig || this.proxyConfig } : {}),
    };
    return this._reqJson("POST", "/v1/automation/run-async", payload);
  }

  async getRun(runId) {
    if (!this.apiKey) {
      throw new Error("Missing TinyFish API key. Set TINYFISH_API_KEY.");
    }
    if (!runId) {
      throw new Error("runId is required for getRun.");
    }
    return this._reqJson("GET", `/v1/runs/${encodeURIComponent(runId)}`);
  }

  async _runSse(payload, onEvent) {
    const response = await this._fetchWithTimeout(`${this.endpoint}/v1/automation/run-sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(payload),
    }, this.sseTimeoutMs);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw this._parseApiError(response.status, bodyText);
    }
    if (!response.body) {
      throw new Error("TinyFish response stream was empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastComplete = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";

      for (const chunk of chunks) {
        const event = this._parseSseChunk(chunk);
        if (!event) continue;
        if (onEvent) onEvent(event);

        const eventType = (event.type || "").toUpperCase();
        if (eventType === "COMPLETE") {
          lastComplete = event;
        }
        if (eventType === "ERROR" || eventType === "FAILED") {
          throw new Error(event.message || event.error || "TinyFish automation failed.");
        }
      }
    }

    if (!lastComplete) {
      throw new Error("TinyFish stream ended without a COMPLETE event.");
    }
    const status = (lastComplete.status || "COMPLETED").toUpperCase();
    if (status === "FAILED" || status === "CANCELLED") {
      const errMsg =
        typeof lastComplete.error === "string"
          ? lastComplete.error
          : lastComplete.error?.message;
      throw new Error(errMsg || "TinyFish automation failed.");
    }
    return lastComplete;
  }

  _parseApiError(status, bodyText) {
    let message = bodyText || "request failed";
    try {
      const json = JSON.parse(bodyText);
      if (json?.error?.message) {
        message = json.error.message;
        if (json.error.code) message += ` (${json.error.code})`;
      }
    } catch (_) {}
    const error = new Error(`TinyFish ${status}: ${message}`);
    error.statusCode = status;
    return error;
  }

  _parseSseChunk(chunk) {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const dataLines = lines.filter((line) => line.startsWith("data:"));
    if (dataLines.length === 0) return null;

    const rawData = dataLines.map((line) => line.slice(5).trim()).join("\n");
    if (!rawData) return null;
    try {
      return JSON.parse(rawData);
    } catch {
      return { type: "MESSAGE", text: rawData };
    }
  }

  _normalizeCompletePayload(event) {
    const resultJson = event.resultJson ?? event.result ?? event.output ?? null;
    if (!resultJson) {
      return {
        runId: event.runId || event.run_id || null,
        status: event.status || "COMPLETED",
        result: null,
      };
    }

    let normalized = resultJson;
    if (typeof normalized === "string") {
      try {
        normalized = JSON.parse(normalized);
      } catch {
        normalized = { raw: resultJson };
      }
    }

    return {
      runId: event.runId || event.run_id || null,
      status: event.status || "COMPLETED",
      result: normalized,
    };
  }

  async _reqJson(method, path, body = null) {
    let lastErr;
    for (let i = 0; i < this.retries; i++) {
      try {
        const response = await this._fetchWithTimeout(`${this.endpoint}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }, this.requestTimeoutMs);

        if (!response.ok) {
          const bodyText = await response.text().catch(() => "");
          throw this._parseApiError(response.status, bodyText);
        }
        return response.json();
      } catch (error) {
        lastErr = error;
        if (!this._isRetryable(error)) break;
        if (i < this.retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
        }
      }
    }
    throw lastErr;
  }

  async _fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error(`TinyFish request timed out after ${timeoutMs}ms`);
        timeoutError.code = "ETIMEDOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  _isRetryable(error) {
    const statusCode = Number(error?.statusCode);
    if (statusCode === 401 || statusCode === 403 || statusCode === 404) return false;
    return true;
  }
}
