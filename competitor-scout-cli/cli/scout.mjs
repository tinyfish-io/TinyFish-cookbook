#!/usr/bin/env node

/**
 * competitor-scout CLI
 *
 * Usage:
 *   node cli/scout.mjs init                          # Create a .scout.json config
 *   node cli/scout.mjs add --name "Notion" --url "https://notion.so"
 *   node cli/scout.mjs list                           # List competitors
 *   node cli/scout.mjs remove --name "Notion"         # Remove a competitor
 *   node cli/scout.mjs research "What sign-in methods do my competitors support?"
 *
 * Environment variables required:
 *   OPENAI_API_KEY    - OpenAI API key
 *   TINYFISH_API_KEY  - Tinyfish API key
 */

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.resolve(process.cwd(), ".scout.json");
const RUNS_FILE = path.resolve(process.cwd(), ".scout-runs.json");
const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";
const ENV_FILE = path.resolve(process.cwd(), ".env.local");

// ─── Helpers ────────────────────────────────────────────────────────────────

function c(color, text) {
  const codes = {
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    reset: "\x1b[0m",
  };
  return `${codes[color] || ""}${text}${codes.reset}`;
}

function log(prefix, msg) {
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${c("dim", ts)} ${prefix} ${msg}`);
}

function info(msg) {
  log(c("cyan", "INFO"), msg);
}
function ok(msg) {
  log(c("green", " OK "), msg);
}
function warn(msg) {
  log(c("yellow", "WARN"), msg);
}
function error(msg) {
  log(c("red", " ERR"), msg);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { competitors: [] };
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
}

function normalizeQuotes(value) {
  if (!value) return value;
  return value
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadRuns() {
  if (!fs.existsSync(RUNS_FILE)) {
    return { runs: [] };
  }
  return JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8"));
}

function saveRuns(runs) {
  fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return;
  const content = fs.readFileSync(ENV_FILE, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    error(`${name} environment variable is not set.`);
    process.exit(1);
  }
  return val;
}

// ─── Tinyfish Client ────────────────────────────────────────────────────────

async function tinyfishSubmit(url, goal) {
  const apiKey = requireEnv("TINYFISH_API_KEY");
  const res = await fetch(`${TINYFISH_BASE}/automation/run-async`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ url, goal }),
  });
  if (!res.ok) throw new Error(`Tinyfish submit failed: ${await res.text()}`);
  const data = await res.json();
  return data.run_id;
}

async function tinyfishStatus(runId) {
  const apiKey = requireEnv("TINYFISH_API_KEY");
  const maxAttempts = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    const res = await fetch(`${TINYFISH_BASE}/runs/${runId}`, {
      headers: { "X-API-Key": apiKey },
    });
    if (res.ok) return await res.json();
    const text = await res.text();
    lastError = new Error(`Tinyfish status failed: ${text}`);
    if (res.status >= 500 && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw lastError;
  }

  throw lastError || new Error("Tinyfish status failed");
}

async function tinyfishCancel(runId) {
  const apiKey = requireEnv("TINYFISH_API_KEY");
  const res = await fetch(`${TINYFISH_BASE}/runs/${runId}/cancel`, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`Tinyfish cancel failed: ${await res.text()}`);
  return await res.json();
}

async function tinyfishWait(runId, label, onStatus) {
  const seen = new Set();
  while (true) {
    const run = await tinyfishStatus(runId);
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(run.status)) {
      return run;
    }
    if (!seen.has(run.status)) {
      seen.add(run.status);
      if (onStatus) onStatus(run.status, label);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// ─── OpenAI Client ──────────────────────────────────────────────────────────

async function openaiChat(messages, jsonMode = false) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const body = {
    model: "gpt-4o",
    messages,
    temperature: 0.3,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function planGoals(competitors, question) {
  const list = competitors
    .map((c, i) => `${i + 1}. ${c.name} (${c.url})`)
    .join("\n");

  const system = `You are a competitive research planning assistant. Create specific, actionable browsing goals for an AI web agent to execute on each competitor's website. The agent visits a URL and follows instructions to extract information.

IMPORTANT:
- "Competitors" means the companies listed below (the user's competitors), not the competitors of those companies.
- Only use the provided competitor list. Do not invent new companies.
- Make goals detailed and specific.
- You may modify the URL to a more specific subpage.
- Ask the browsing agent to capture source URLs (including child pages it visits) where it finds evidence.`;

  const user = `Competitors:\n${list}\n\nResearch question: "${question}"\n\nFor each competitor, return a JSON object with a "goals" array containing objects with:\n- "competitor_name"\n- "competitor_url" (can be a specific subpage)\n- "goal" (detailed agent instructions)\n\nReturn ONLY the JSON object.`;

  const raw = await openaiChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    true
  );

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed)
    ? parsed
    : parsed.goals || parsed.tasks || Object.values(parsed)[0];
}

async function summarizeResult(name, question, rawResult) {
  const system =
    "You are a competitive research analyst. Summarize the extracted data into clear, concise findings. Use bullet points. Keep under 200 words. Do not include URLs or a Sources section.";
  const user = `Research question: "${question}"\nCompetitor: ${name}\n\nRaw data:\n${JSON.stringify(rawResult, null, 2)}\n\nProvide a clear summary.`;

  return openaiChat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

async function generateReport(question, results) {
  const system = `You are a competitive research analyst. Create a comparison report with:
1. Executive Summary (2-3 sentences)
2. Per-Competitor Findings
3. Comparison Table (markdown)
4. Key Insights

Be concise, factual, and actionable.`;

  const findings = results
    .map((r) => `### ${r.name}\n${r.summary}`)
    .join("\n\n");

  const user = `Research question: "${question}"\n\nFindings:\n${findings}\n\nGenerate a comparison report.`;

  return openaiChat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

// ─── Commands ───────���───────────────────────────────────────────────────────

function cmdInit() {
  if (fs.existsSync(CONFIG_FILE)) {
    warn(`.scout.json already exists at ${CONFIG_FILE}`);
    return;
  }
  saveConfig({ competitors: [] });
  ok(`Created ${CONFIG_FILE}`);
  info('Add competitors with: node cli/scout.mjs add --name "Name" --url "https://..."');
}

function cmdClear() {
  const config = loadConfig();
  if (!config.competitors.length) {
    warn("No competitors to clear.");
    return;
  }
  config.competitors = [];
  saveConfig(config);
  ok("Removed all competitors.");
}

function cmdReset() {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
  if (fs.existsSync(RUNS_FILE)) {
    fs.unlinkSync(RUNS_FILE);
  }
  ok("Reset CLI state (.scout.json and .scout-runs.json removed).");
}

function cmdAdd(args) {
  const nameIdx = args.indexOf("--name");
  const urlIdx = args.indexOf("--url");
  if (nameIdx === -1 || urlIdx === -1) {
    error('Usage: scout add --name "Name" --url "https://..."');
    process.exit(1);
  }
  const name = normalizeQuotes(args[nameIdx + 1]);
  let url = normalizeQuotes(args[urlIdx + 1]);
  if (!url.startsWith("http")) url = `https://${url}`;

  const config = loadConfig();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  config.competitors.push({ id, name, url });
  saveConfig(config);
  ok(`Added ${c("bold", name)} (${url})`);
}

function cmdList() {
  const config = loadConfig();
  if (config.competitors.length === 0) {
    info("No competitors configured. Use 'add' to add some.");
    return;
  }
  console.log(`\n${c("bold", "Competitors")} (${config.competitors.length}):\n`);
  for (const comp of config.competitors) {
    console.log(`  ${c("green", ">")} ${c("bold", comp.name)}`);
    console.log(`    ${c("dim", comp.url)}`);
  }
  console.log();
}

function cmdRemove(args) {
  const nameIdx = args.indexOf("--name");
  if (nameIdx === -1) {
    error('Usage: scout remove --name "Name"');
    process.exit(1);
  }
  const name = normalizeQuotes(args[nameIdx + 1]).toLowerCase();
  const config = loadConfig();
  const before = config.competitors.length;
  config.competitors = config.competitors.filter(
    (c) => c.name.toLowerCase() !== name
  );
  if (config.competitors.length === before) {
    warn(`No competitor named "${args[nameIdx + 1]}" found.`);
    return;
  }
  saveConfig(config);
  ok(`Removed ${args[nameIdx + 1]}`);
}

async function cmdResearch(args) {
  const question = args.find((a) => !a.startsWith("--"));
  if (!question) {
    error("Usage: scout research \"Your research question\"");
    process.exit(1);
  }

  const config = loadConfig();
  if (config.competitors.length === 0) {
    error("No competitors configured. Add some first.");
    process.exit(1);
  }

  console.log();
  console.log(
    `${c("bold", "Research:")} ${c("cyan", question)}`
  );
  console.log(
    `${c("dim", `Competitors: ${config.competitors.map((c) => c.name).join(", ")}`)}`
  );
  console.log();

  // Step 1: Plan
  info("Planning research goals with OpenAI...");
  const goals = await planGoals(config.competitors, question);

  for (const g of goals) {
    console.log(
      `  ${c("green", ">")} ${c("bold", g.competitor_name)}: ${c("dim", g.goal.slice(0, 80))}...`
    );
  }
  console.log();

  // Step 2: Submit all runs concurrently
  info("Dispatching Tinyfish agents...");
  const storedRuns = loadRuns();
  const runPromises = goals.map(async (goal, index) => {
    const comp = config.competitors.find(
      (c) => c.name.toLowerCase() === goal.competitor_name.toLowerCase()
    ) || config.competitors[index];
    const compIndex = config.competitors.findIndex((c) => c.id === comp.id);
    const runGoal =
      typeof goal.goal === "string" && goal.goal.trim()
        ? goal.goal.trim()
        : `Find information on "${question}" for ${comp.name}.`;
    const goalWithSources = `${runGoal}\n\nWhen you find evidence, list the exact source URLs (including child pages you visited) in a "sources" list.`;

    try {
      const runId = await tinyfishSubmit(goal.competitor_url, goalWithSources);
      storedRuns.runs.push({
        runId,
        competitor: comp.name,
        goal: goalWithSources,
        url: goal.competitor_url,
        createdAt: new Date().toISOString(),
      });
      saveRuns(storedRuns);
      ok(`${comp.name}: dispatched (${runId.slice(0, 8)}...)`);
      return { comp, goal: goalWithSources, runId, compIndex };
    } catch (err) {
      error(`${comp.name}: failed to dispatch - ${err.message}`);
      return null;
    }
  });

  const runs = (await Promise.all(runPromises)).filter(Boolean);

  console.log();

  // Step 3: Wait for all concurrently
  info("Waiting for agents to complete...");
  const runResults = await Promise.all(
    runs.map(async (run) => {
      const result = await tinyfishWait(run.runId, run.comp.name, (status, label) => {
        info(`${label}: ${status}`);
      });
      return { run, result };
    })
  );

  // Step 4: Summarize after all complete (input order)
  const completedResults = [];
  const summaries = await Promise.all(
    runResults.map(async ({ run, result }) => {
      if (result.status === "COMPLETED" && result.result) {
        const summary = await summarizeResult(
          run.comp.name,
          question,
          result.result
        );
        return {
          name: run.comp.name,
          summary,
          rawResult: result.result,
          compIndex: run.compIndex,
        };
      }
      error(
        `${run.comp.name}: ${result.status}${result.error ? ` - ${result.error}` : ""}`
      );
      return null;
    })
  );

  summaries
    .filter(Boolean)
    .sort((a, b) => a.compIndex - b.compIndex)
    .forEach((item) => {
      ok(`${item.name}: completed`);
      console.log();
      console.log(`${c("bold", c("green", `--- ${item.name} ---`))}`);
      console.log(item.summary);
      console.log();
      completedResults.push({
        name: item.name,
        summary: item.summary,
        rawResult: item.rawResult,
      });
    });

  // Step 4: Generate report
  if (completedResults.length > 0) {
    console.log();
    info("Generating comparison report...");
    const report = await generateReport(question, completedResults);

    console.log();
    console.log(c("bold", "═══════════════════════════════════════════════"));
    console.log(c("bold", c("green", " COMPARISON REPORT")));
    console.log(c("bold", "═══════════════════════════════════════════════"));
    console.log();
    console.log(report);
    console.log();

    // Save report
    const reportFile = path.resolve(
      process.cwd(),
      `scout-report-${Date.now()}.md`
    );
    fs.writeFileSync(reportFile, `# Research: ${question}\n\n${report}`);
    ok(`Report saved to ${reportFile}`);

    // Save raw JSON
    const jsonFile = path.resolve(
      process.cwd(),
      `scout-results-${Date.now()}.json`
    );
    fs.writeFileSync(
      jsonFile,
      JSON.stringify({ question, results: completedResults }, null, 2)
    );
    ok(`Raw results saved to ${jsonFile}`);
  } else {
    warn("No results collected. Check your competitor URLs and try again.");
  }
}

function cmdRuns() {
  const stored = loadRuns();
  if (!stored.runs.length) {
    info("No recorded runs yet.");
    return;
  }
  console.log(`\n${c("bold", "Runs")} (${stored.runs.length}):\n`);
  for (const run of stored.runs) {
    console.log(`  ${c("green", ">")} ${c("bold", run.runId)}`);
    console.log(`    ${c("dim", `${run.competitor} • ${run.createdAt}`)}`);
  }
  console.log();
}

async function cmdCancel(args) {
  const runIdx = args.indexOf("--run");
  let runId = "";
  if (runIdx !== -1) {
    runId = args[runIdx + 1] || "";
  } else {
    const stored = loadRuns();
    const last = stored.runs[stored.runs.length - 1];
    runId = last?.runId || "";
  }

  if (!runId) {
    error('No run ID found. Use: scout runs (or scout cancel --run "RUN_ID")');
    process.exit(1);
  }

  try {
    await tinyfishCancel(runId);
    ok(`Cancelled run ${runId}`);
  } catch (err) {
    error(err.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  loadEnvFile();
  const args = process.argv.slice(2);
  const command = args[0];

  console.log();
  console.log(
    `${c("green", ">")} ${c("bold", "competitor-scout")} ${c("dim", "v1.0")}`
  );

  switch (command) {
    case "init":
      cmdInit();
      break;
    case "add":
      cmdAdd(args.slice(1));
      break;
    case "list":
    case "ls":
      cmdList();
      break;
    case "remove":
    case "rm":
      cmdRemove(args.slice(1));
      break;
    case "clear":
    case "rm-all":
      cmdClear();
      break;
    case "research":
    case "ask":
      await cmdResearch(args.slice(1));
      break;
    case "runs":
      cmdRuns();
      break;
    case "cancel":
      await cmdCancel(args.slice(1));
      break;
    case "reset":
      cmdReset();
      break;
    default:
      console.log();
      console.log(`${c("bold", "Usage:")}`);
      console.log(`  ${c("green", "init")}                              Create .scout.json config`);
      console.log(`  ${c("green", "add")} --name "X" --url "https://x"  Add a competitor`);
      console.log(`  ${c("green", "list")}                              List competitors`);
      console.log(`  ${c("green", "remove")} --name "X"                   Remove a competitor`);
      console.log(`  ${c("green", "clear")}                             Remove all competitors`);
      console.log(`  ${c("green", "runs")}                              List recorded runs`);
      console.log(`  ${c("green", "cancel")} [--run "RUN_ID"]           Cancel latest or specified run`);
      console.log(`  ${c("green", "research")} "your question"            Run competitive research`);
      console.log(`  ${c("green", "reset")}                             Reset CLI state files`);
      console.log();
      console.log(`${c("bold", "Environment variables:")}`);
      console.log(`  OPENAI_API_KEY     OpenAI API key`);
      console.log(`  TINYFISH_API_KEY   Tinyfish API key`);
      console.log();
      break;
  }
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
