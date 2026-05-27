const { githubRequest } = require("./github-auth");

function scoreEmoji(score) {
  if (score === null) return "❓";
  if (score >= 8) return "✅";
  if (score >= 6) return "⚠️";
  if (score >= 4) return "🟠";
  return "🔴";
}

function scoreLabel(score) {
  if (score === null) return "Unknown";
  if (score >= 8) return "Healthy";
  if (score >= 6) return "Watch";
  if (score >= 4) return "Concern";
  return "Critical";
}

function actionLabel(score) {
  if (score === null) return "Manual check recommended";
  if (score >= 8) return "No action needed";
  if (score >= 6) return "Monitor monthly";
  if (score >= 4) return "Start evaluating alternatives";
  return "Begin migration planning now";
}

function formatSignalBullets(signals) {
  const bullets = [];

  const { status, blog, hn, pricing } = signals;

  if (status) {
    if (status.current_status === "outage") bullets.push("🔴 **Status page shows active outage**");
    else if (status.current_status === "degraded") bullets.push("🟠 Status page shows degraded performance");
    else if (status.current_status === "operational") bullets.push("✅ Status page: operational");
    if (status.incident_count_visible > 3) bullets.push(`⚠️ ${status.incident_count_visible} recent incidents visible`);
  }

  if (blog?.deprecation_found) {
    bullets.push("🔴 **Deprecation or shutdown announcement found**");
  } else if (blog?.signals?.length > 0) {
    const high = blog.signals.filter((s) => s.severity === "high");
    const med = blog.signals.filter((s) => s.severity === "medium");
    if (high.length > 0) bullets.push(`🟠 ${high[0].summary || high[0].title}`);
    if (med.length > 0) bullets.push(`⚠️ ${med[0].summary || med[0].title}`);
  }

  if (hn?.sentiment === "negative" && hn.negative_stories?.length > 0) {
    const top = hn.negative_stories[0];
    bullets.push(`💬 HN: "${top.title}" (${top.points} points)`);
  }

  if (pricing) {
    if (!pricing.free_tier_exists) bullets.push("💸 Free tier may no longer exist");
    if (pricing.pricing_change_signals?.length > 0) {
      bullets.push(`💸 Pricing signal: ${pricing.pricing_change_signals[0]}`);
    }
  }

  if (bullets.length === 0) bullets.push("No warning signals found");

  return bullets.map((b) => `- ${b}`).join("\n");
}

function buildIssueBody(results, allHealthy) {
  const now = new Date().toUTCString();
  const nextCheck = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toDateString();

  // Sort: lowest score first
  const sorted = [...results].sort((a, b) => {
    if (a.score === null) return -1;
    if (b.score === null) return 1;
    return a.score - b.score;
  });

  const warnings = sorted.filter((r) => r.score !== null && r.score < 7);
  const healthy = sorted.filter((r) => r.score !== null && r.score >= 7);
  const errored = sorted.filter((r) => r.score === null);

  let body = `# 🔭 API Deathwatch Report\n\n`;
  body += `> Scanned ${results.length} service${results.length !== 1 ? "s" : ""} from your \`package.json\` · ${now}\n`;
  body += `> Next scan: **${nextCheck}**\n\n`;

  // Summary table
  body += `## Summary\n\n`;
  body += `| Service | Score | Status | Action |\n`;
  body += `|---------|-------|--------|--------|\n`;
  for (const r of sorted) {
    const score = r.score !== null ? `${r.score}/10` : "N/A";
    body += `| **${r.service}** | ${score} | ${scoreEmoji(r.score)} ${scoreLabel(r.score)} | ${actionLabel(r.score)} |\n`;
  }

  body += `\n---\n\n`;

  // Warning details
  if (warnings.length > 0) {
    body += `## ⚠️ Services Requiring Attention\n\n`;
    for (const r of warnings) {
      body += `### ${scoreEmoji(r.score)} ${r.service} — ${r.score}/10\n\n`;
      body += `**Signals found:**\n\n`;
      body += formatSignalBullets(r.signals);
      body += `\n\n**Recommended action:** ${actionLabel(r.score)}\n\n`;
      body += `---\n\n`;
    }
  }

  // Healthy services (collapsed)
  if (healthy.length > 0) {
    body += `## ✅ Healthy Services\n\n`;
    body += `<details>\n<summary>View ${healthy.length} healthy service${healthy.length !== 1 ? "s" : ""}</summary>\n\n`;
    for (const r of healthy) {
      body += `**${r.service}** — ${r.score}/10 · No action needed\n\n`;
    }
    body += `</details>\n\n`;
  }

  // Errored
  if (errored.length > 0) {
    body += `## ❓ Could Not Check\n\n`;
    for (const r of errored) {
      body += `- **${r.service}**: ${r.error || "Check failed"} — please verify manually\n`;
    }
    body += `\n`;
  }

  body += `---\n\n`;
  body += `*Powered by [API Deathwatch](https://github.com/apps/api-deathwatch) · `;
  body += `[Uninstall](https://github.com/settings/installations) to stop receiving reports*`;

  return body;
}

async function createIssue(installationId, owner, repo, results, allHealthy) {
  const warnings = results.filter((r) => r.score !== null && r.score < 7);
  const criticals = results.filter((r) => r.score !== null && r.score < 4);

  // Build title
  let title;
  if (criticals.length > 0) {
    title = `🔴 API Deathwatch: ${criticals.map((r) => r.service).join(", ")} need urgent attention`;
  } else if (warnings.length > 0) {
    title = `⚠️ API Deathwatch: ${warnings.length} service${warnings.length !== 1 ? "s" : ""} flagged for review`;
  } else {
    title = `✅ API Deathwatch: All services healthy`;
  }

  // Labels to apply (create them if they don't exist)
  const labels = ["api-deathwatch"];
  if (criticals.length > 0) labels.push("critical");

  // Try to ensure labels exist
  try {
    await githubRequest(`/repos/${owner}/${repo}/labels`, installationId, {
      method: "POST",
      body: JSON.stringify({ name: "api-deathwatch", color: "0075ca", description: "API health monitoring" }),
    });
  } catch {
    // Label probably already exists, that's fine
  }

  const body = buildIssueBody(results, allHealthy);

  const issue = await githubRequest(`/repos/${owner}/${repo}/issues`, installationId, {
    method: "POST",
    body: JSON.stringify({
      title,
      body,
      labels: ["api-deathwatch"],
    }),
  });

  console.log(`Created issue #${issue.number}: ${title}`);
  return issue;
}

module.exports = { createIssue };
