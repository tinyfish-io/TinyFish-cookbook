require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { execFile } = require("child_process");

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY || "";
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";

app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests",
      message: "Please wait a minute before scanning again.",
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// Helpers
// -------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label = "Request timeout") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label)), ms)
    ),
  ]);
}

function normalizeUrl(input) {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return safeJsonParse(match[0]);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function uniqByLabel(signals) {
  const seen = new Set();
  return (signals || []).filter((s) => {
    const label = typeof s === "string" ? s : s?.label;
    if (!label || seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

// -------------------------
// WHOIS CLI + RDAP fallback
// -------------------------

function whoisLookup(domain) {
  return new Promise((resolve, reject) => {
    execFile("whois", [domain], { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout || "");
    });
  });
}

function parseWhois(raw, domain) {
  const get = (regex) => {
    const match = raw.match(regex);
    return match ? match[1].trim() : null;
  };

  const created =
    get(/Creation Date:\s*(.+)/i) ||
    get(/Registered On:\s*(.+)/i) ||
    get(/Domain Registration Date:\s*(.+)/i) ||
    get(/Created On:\s*(.+)/i) ||
    get(/Registered:\s*(.+)/i);

  const expires =
    get(/Expiry Date:\s*(.+)/i) ||
    get(/Registrar Registration Expiration Date:\s*(.+)/i) ||
    get(/Registry Expiry Date:\s*(.+)/i) ||
    get(/Expires On:\s*(.+)/i) ||
    get(/Expiration Date:\s*(.+)/i);

  const registrar =
    get(/Registrar:\s*(.+)/i) ||
    get(/Sponsoring Registrar:\s*(.+)/i) ||
    get(/Registrar Name:\s*(.+)/i);

  const country =
    get(/Registrant Country:\s*(.+)/i) ||
    get(/Country:\s*(.+)/i) ||
    "Unknown";

  let age_days = null;
  if (created) {
    const createdDate = new Date(created);
    if (!isNaN(createdDate)) {
      age_days = Math.floor(
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const statusMatches = [...raw.matchAll(/Status:\s*(.+)/gi)].map((m) =>
    m[1].trim()
  );

  return {
    domain,
    registrar: registrar || "Unknown",
    country,
    created: created || null,
    expires: expires || null,
    age_days,
    status: statusMatches,
    source: "whois-cli",
  };
}

async function fetchRdap(domain) {
  const res = await fetch(`https://rdap.org/domain/${domain}`);
  if (!res.ok) {
    throw new Error(`RDAP failed with status ${res.status}`);
  }
  return res.json();
}

function parseRdap(rdap, domain) {
  if (!rdap) {
    return {
      domain,
      registrar: "Unknown",
      country: "Unknown",
      created: null,
      expires: null,
      age_days: null,
      status: [],
      source: "rdap",
    };
  }

  const registrarEntity =
    (rdap.entities || []).find((e) => (e.roles || []).includes("registrar")) ||
    (rdap.entities || [])[0];

  const registrar =
    registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ||
    "Unknown";

  const created =
    (rdap.events || []).find((e) => e.eventAction === "registration")
      ?.eventDate || null;

  const expires =
    (rdap.events || []).find((e) => e.eventAction === "expiration")
      ?.eventDate || null;

  let age_days = null;
  if (created) {
    const createdDate = new Date(created);
    if (!isNaN(createdDate)) {
      age_days = Math.floor(
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const country =
    registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === "adr")?.[3]?.[6] ||
    "Unknown";

  return {
    domain: rdap.ldhName || domain,
    registrar,
    country,
    created,
    expires,
    age_days,
    status: rdap.status || [],
    source: "rdap",
  };
}

async function getWhoisData(domain) {
  try {
    const raw = await withTimeout(
      whoisLookup(domain),
      12000,
      "WHOIS lookup timed out"
    );
    return parseWhois(raw, domain);
  } catch (err) {
    console.warn("WHOIS CLI failed, falling back to RDAP:", err.message);
    try {
      const rdap = await withTimeout(
        fetchRdap(domain),
        12000,
        "RDAP lookup timed out"
      );
      return parseRdap(rdap, domain);
    } catch (rdapErr) {
      console.warn("RDAP fallback failed:", rdapErr.message);
      return {
        domain,
        registrar: "Unknown",
        country: "Unknown",
        created: null,
        expires: null,
        age_days: null,
        status: [],
        source: "none",
      };
    }
  }
}

// -------------------------
// VirusTotal
// -------------------------

async function fetchVirusTotal(url) {
  if (!VIRUSTOTAL_API_KEY) return null;

  try {
    const encoded = Buffer.from(url).toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    let res = await fetch(`https://www.virustotal.com/api/v3/urls/${encoded}`, {
      headers: {
        "x-apikey": VIRUSTOTAL_API_KEY,
      },
    });

    if (res.status === 404) {
      const submitRes = await fetch("https://www.virustotal.com/api/v3/urls", {
        method: "POST",
        headers: {
          "x-apikey": VIRUSTOTAL_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `url=${encodeURIComponent(url)}`,
      });

      if (!submitRes.ok) {
        throw new Error(`VirusTotal submit failed: ${submitRes.status}`);
      }

      const submitData = await submitRes.json();
      const analysisId = submitData.data?.id;

      if (!analysisId) return null;

      for (let i = 0; i < 6; i++) {
        await sleep(3000);

        const pollRes = await fetch(
          `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
          {
            headers: {
              "x-apikey": VIRUSTOTAL_API_KEY,
            },
          }
        );

        if (!pollRes.ok) continue;

        const pollData = await pollRes.json();
        const attrs = pollData.data?.attributes;

        if (attrs?.status === "completed") {
          return {
            stats: attrs.stats || null,
            results: attrs.results || null,
            source: "virustotal-analysis",
          };
        }
      }

      return null;
    }

    if (!res.ok) {
      throw new Error(`VirusTotal fetch failed: ${res.status}`);
    }

    const data = await res.json();

    return {
      stats: data.data?.attributes?.last_analysis_stats || null,
      results: data.data?.attributes?.last_analysis_results || null,
      reputation: data.data?.attributes?.reputation ?? null,
      source: "virustotal-url-report",
    };
  } catch (err) {
    console.error("VirusTotal error:", err.message);
    return null;
  }
}

// -------------------------
// TinyFish
// -------------------------
// -------------------------
// TinyFish SSE
// -------------------------

const TINYFISH_GOAL = [
    `You are a phishing detection agent. Analyze the URL for phishing indicators`,
    'Return only JSON.',
    '{',
    '  "redirects": ["https://example.com"],',
    '  "final_url": "https://example.com",',
    '  "domain": "example.com",',
    '  "uses_ssl": true,',
    '  "has_login_form": false,',
    '  "urgency_language": false,',
    '  "suspicious_scripts": false,',
    '  "brand_impersonation": [{"brand":"PayPal","similarity":0}],',
    '  "threat_signals": [{"label":"signal text","severity":"low"}],',
    '  "risk_score": 0,',
    '  "verdict": "SAFE",',
    '  "summary": "one sentence summary"',
    '}'
  ].join('\n');

async function fetchTinyFish(url) {
  if (!TINYFISH_API_KEY) return null;

  const goal = TINYFISH_GOAL;

  try {
    const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: "lite",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`TinyFish SSE failed: ${res.status} ${text}`);
    }

    if (!res.body) {
      throw new Error("TinyFish SSE response has no body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let finalResult = null;
    let streamingUrl = null;
    let runId = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let eventName = "";
        const dataLines = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            dataLines.push(trimmed.slice(5).trim());
          }
        }

        if (!dataLines.length) continue;

        const dataText = dataLines.join("\n");

        if (dataText === "[DONE]") continue;

        let parsed;
        try {
          parsed = JSON.parse(dataText);
        } catch {
          continue;
        }

        // TinyFish docs: STARTED includes run_id
        if (parsed.run_id) {
          runId = parsed.run_id;
        }

        // TinyFish docs: STREAMING_URL event includes streaming_url
        const candidateStreamUrl =
          parsed.streaming_url ||
          parsed.browser_stream_url ||
          parsed.stream_url ||
          parsed.live_url ||
          parsed.browser_url ||
          parsed.viewer_url ||
          parsed.session_url ||
          null;

        if (candidateStreamUrl) {
          streamingUrl = candidateStreamUrl;
        }

        // TinyFish docs: COMPLETE event includes result
        if (parsed.result && typeof parsed.result === "object") {
          finalResult = parsed.result;
        } else if (
          parsed &&
          typeof parsed === "object" &&
          (
            parsed.risk_score !== undefined ||
            parsed.verdict !== undefined ||
            parsed.final_url !== undefined ||
            parsed.redirects !== undefined
          )
        ) {
          finalResult = parsed;
        }
      }
    }

    return {
      run_id: runId,
      result: finalResult,
      browser_stream_url: streamingUrl,
    };
  } catch (err) {
    console.error("TinyFish SSE error:", err);
    return null;
  }
}

// -------------------------
// TinyFish response normaliser
// -------------------------

function normaliseTinyFish(raw) {
  if (!raw || typeof raw !== "object") return null;

  const toBool = (val) => {
    if (typeof val === "boolean") return val;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
    if (typeof val === "number") return val > 0;
    return false;
  };

  const toArray = (val) => {
    if (Array.isArray(val)) return val;
    if (!val || val === "None" || val === "none") return [];
    return [val];
  };

  const toInt = (val, fallback = 0) => {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : Math.min(100, Math.max(0, n));
  };

  const validVerdicts = ["SAFE", "SUSPICIOUS", "PHISHING"];
  const verdict = validVerdicts.includes(String(raw.verdict || "").toUpperCase())
    ? String(raw.verdict).toUpperCase()
    : null;

  const brandImpersonation = toArray(raw.brand_impersonation).map((b) => {
    if (typeof b === "string") return { brand: b, similarity: 100 };
    return {
      brand: b.brand || b.name || String(b),
      similarity: toInt(b.similarity ?? b.score ?? 50),
    };
  });

  return {
    redirects: toArray(raw.redirects).filter((r) => typeof r === "string"),
    final_url: raw.final_url || raw.finalUrl || null,
    domain: raw.domain || null,
    uses_ssl: toBool(raw.uses_ssl ?? raw.usesSsl ?? raw.ssl),
    has_login_form: toBool(raw.has_login_form ?? raw.hasLoginForm ?? raw.login_form),
    urgency_language: toBool(raw.urgency_language ?? raw.urgencyLanguage ?? raw.urgency),
    suspicious_scripts: toBool(raw.suspicious_scripts ?? raw.suspiciousScripts),
    brand_impersonation: brandImpersonation,
    threat_signals: toArray(raw.threat_signals ?? raw.threatSignals).filter(
      (s) => typeof s === "string" || (s && typeof s === "object" && s.label)
    ),
    risk_score: toInt(raw.risk_score ?? raw.riskScore),
    verdict,
    summary: raw.summary || null,
  };
}

// -------------------------
// Fallback heuristics
// -------------------------

function buildHeuristicSignals(url, domain) {
  const signals = [];
  const lowerUrl = url.toLowerCase();
  const lowerDomain = (domain || "").toLowerCase();

  if (lowerUrl.includes("@")) {
    signals.push({ label: "URL contains @ symbol", severity: "high" });
  }

  if (lowerUrl.includes("login") || lowerUrl.includes("verify")) {
    signals.push({ label: "Sensitive action keywords in URL", severity: "medium" });
  }

  if ((lowerDomain.match(/-/g) || []).length >= 2) {
    signals.push({ label: "Domain contains many hyphens", severity: "medium" });
  }

  if (/(\d{1,3}\.){3}\d{1,3}/.test(lowerDomain)) {
    signals.push({ label: "Raw IP address used as host", severity: "high" });
  }

  if (lowerDomain.split(".").length > 3) {
    signals.push({ label: "Many subdomains present", severity: "medium" });
  }

  return signals;
}

function scoreWhois(whois) {
  let score = 0;

  if (whois?.age_days != null && whois.age_days < 30) score += 25;
  else if (whois?.age_days != null && whois.age_days < 180) score += 10;

  return score;
}

function scoreVirusTotal(vt) {
  if (!vt?.stats) return 0;

  let score = 0;
  if ((vt.stats.malicious || 0) > 0) score += 30;
  if ((vt.stats.suspicious || 0) > 0) score += 15;

  return score;
}

function scoreTinyFish(tf) {
  if (!tf) return 0;

  let score = 0;

  if (!tf.uses_ssl) score += 20;
  if (tf.has_login_form === true) score += 15;

  const urgency = tf.urgency_language;
  if (urgency === true || (Array.isArray(urgency) && urgency.length > 0)) score += 20;

  const scripts = tf.suspicious_scripts;
  if (scripts === true || (Array.isArray(scripts) && scripts.length > 0)) score += 15;

  const brandTop = tf.brand_impersonation?.[0];
  if (brandTop?.similarity >= 80) score += 25;
  else if (brandTop?.similarity >= 50) score += 15;

  return score;
}

function computeRisk(tf, whois, vt, heuristics) {
  let score = 0;
  score += scoreTinyFish(tf);
  score += scoreWhois(whois);
  score += scoreVirusTotal(vt);
  score += Math.min((heuristics?.length || 0) * 8, 20);

  if (typeof tf?.risk_score === "number") {
    score = Math.max(score, tf.risk_score);
  }

  score = Math.min(score, 100);

  let verdict = "SAFE";
  if (score >= 70) verdict = "PHISHING";
  else if (score >= 40) verdict = "SUSPICIOUS";

  return { score, verdict };
}

function buildCombinedThreatSignals(tf, whois, vt, heuristics) {
  const signals = [];

  if (Array.isArray(tf?.threat_signals)) {
    for (const s of tf.threat_signals) {
      if (typeof s === "string") {
        signals.push({ label: s, severity: "medium" });
      } else if (s?.label) {
        signals.push({
          label: s.label,
          severity: s.severity || "medium",
        });
      }
    }
  }

  if (tf?.has_login_form === true) {
    signals.push({ label: "Login form present", severity: "medium" });
  }

  const urgency = tf?.urgency_language;
  if (urgency === true || (Array.isArray(urgency) && urgency.length > 0)) {
    signals.push({ label: "Urgency language detected", severity: "high" });
  }

  const scripts = tf?.suspicious_scripts;
  if (scripts === true || (Array.isArray(scripts) && scripts.length > 0)) {
    signals.push({ label: "Suspicious scripts detected", severity: "medium" });
  }

  if (tf && tf.uses_ssl === false) {
    signals.push({ label: "No SSL / HTTPS detected", severity: "high" });
  }

  if (whois?.age_days != null && whois.age_days < 30) {
    signals.push({ label: "Domain is less than 30 days old", severity: "high" });
  } else if (whois?.age_days != null && whois.age_days < 180) {
    signals.push({ label: "Domain is less than 6 months old", severity: "medium" });
  }

  if ((vt?.stats?.malicious || 0) > 0) {
    signals.push({
      label: `VirusTotal malicious detections: ${vt.stats.malicious}`,
      severity: "high",
    });
  }

  if ((vt?.stats?.suspicious || 0) > 0) {
    signals.push({
      label: `VirusTotal suspicious detections: ${vt.stats.suspicious}`,
      severity: "medium",
    });
  }

  for (const s of heuristics || []) {
    signals.push(s);
  }

  return uniqByLabel(signals);
}

// -------------------------
// API routes
// -------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "phishguard",
    env: NODE_ENV,
  });
});

app.get("/api/scan-stream", async (req, res) => {
  const url = normalizeUrl(req.query.url || "");

  if (!url) {
    return res.status(400).end("Missing url");
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent("status", { message: "Starting scan..." });

    const domain = extractDomain(url);

    // kick off background tasks in parallel
    const whoisPromise = getWhoisData(domain).catch(() => null);
    const vtPromise = fetchVirusTotal(url).catch(() => null);

    let tinyfishResult = null;
    let tinyfishStreamUrl = null;

    try {
      if (!TINYFISH_API_KEY) {
        throw new Error("TinyFish API key not configured");
      }

      const tfRes = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
        method: "POST",
        headers: {
          "X-API-Key": TINYFISH_API_KEY,
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          url,
          goal: TINYFISH_GOAL,
          browser_profile: "lite",
        }),
      });

      if (!tfRes.ok || !tfRes.body) {
        const text = await tfRes.text().catch(() => "");
        throw new Error(`TinyFish SSE failed: ${tfRes.status} ${text}`);
      }

      const reader = tfRes.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const dataLines = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              dataLines.push(trimmed.slice(5).trim());
            }
          }

          if (!dataLines.length) continue;

          const dataText = dataLines.join("\n");
          if (dataText === "[DONE]") continue;

          let parsed;
          try {
            parsed = JSON.parse(dataText);
          } catch {
            continue;
          }

          sendEvent("tinyfish", parsed);

          if (parsed.type === "STREAMING_URL" && parsed.streaming_url) {
            tinyfishStreamUrl = parsed.streaming_url;
            sendEvent("stream_url", { streaming_url: tinyfishStreamUrl });
          }

          if (parsed.type === "PROGRESS") {
            sendEvent("progress", { message: parsed.purpose || "Working..." });
          }

          if (parsed.type === "COMPLETE") {
            const raw = parsed.result?.result || parsed.result || null;

            let parsed_raw = null;
            if (typeof raw === "string") {
              const match = raw.match(/\{[\s\S]*\}/);
              if (match) {
                try { parsed_raw = JSON.parse(match[0]); } catch {}
              }
            } else if (raw && typeof raw === "object") {
              parsed_raw = raw;
            }

            if (parsed_raw) {
              tinyfishResult = normaliseTinyFish(parsed_raw);
            }
          }
        }
      }
    } catch (tfErr) {
      console.warn("TinyFish browser scan failed (non-fatal):", tfErr.message);
      sendEvent("progress", { message: "Browser scan unavailable — completing with static analysis..." });
    }

    const [whois, virustotal] = await Promise.all([whoisPromise, vtPromise]);

    const heuristics = buildHeuristicSignals(url, domain);
    const { score, verdict } = computeRisk(
      tinyfishResult,
      whois,
      virustotal,
      heuristics
    );

    const payload = {
      ok: true,
      scanned_at: new Date().toISOString(),
      url,
      domain,
      final_url: tinyfishResult?.final_url || url,
      redirects: tinyfishResult?.redirects || [url],
      whois,
      virustotal,
      tinyfish: tinyfishResult,
      tinyfish_stream_url: tinyfishStreamUrl,
      threat_signals: buildCombinedThreatSignals(
        tinyfishResult,
        whois,
        virustotal,
        heuristics
      ),
      brand_impersonation: tinyfishResult?.brand_impersonation || [],
      uses_ssl:
        typeof tinyfishResult?.uses_ssl === "boolean"
          ? tinyfishResult.uses_ssl
          : url.startsWith("https://"),
      has_login_form: tinyfishResult?.has_login_form === true,
      urgency_language: tinyfishResult?.urgency_language === true || (Array.isArray(tinyfishResult?.urgency_language) && tinyfishResult.urgency_language.length > 0),
      suspicious_scripts: tinyfishResult?.suspicious_scripts === true || (Array.isArray(tinyfishResult?.suspicious_scripts) && tinyfishResult.suspicious_scripts.length > 0),
      risk_score: score,
      verdict,
      summary:
        tinyfishResult?.summary ||
        "Scan completed.",
    };

    sendEvent("complete", payload);
    res.end();
  } catch (err) {
    sendEvent("error", { message: err.message || "Scan failed" });
    res.end();
  }
});

// Optional fallback for single-page frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});