'use strict';

const fs = require('fs');
const path = require('path');
const { gradeScore } = require('../utils/scoring');

/**
 * HTMLReporter — generates a self-contained HTML report similar to Lighthouse's
 * report format, including category gauges, audit item tables, and a screenshot.
 */
class HTMLReporter {
  static generate(results) {
    const { url, auditedAt, screenshot, pageInfo, statusCode, overallScore, categories } = results;
    const overallGrade = gradeScore(overallScore);

    const categoryCards = Object.values(categories).map((cat) => {
      const grade = gradeScore(cat.score);
      return `
        <div class="category-card">
          <div class="gauge gauge-${grade.color}">
            <svg viewBox="0 0 120 120" class="gauge-svg">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" stroke-width="10"/>
              <circle cx="60" cy="60" r="54" fill="none" stroke="${HTMLReporter._gaugeColor(cat.score)}" stroke-width="10"
                stroke-dasharray="${HTMLReporter._dashArray(cat.score)}" stroke-dashoffset="0"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div class="gauge-score">${cat.score}</div>
          </div>
          <div class="category-title">${cat.title}</div>
          <div class="category-grade grade-${grade.color}">${grade.grade} — ${grade.label}</div>
        </div>`;
    }).join('');

    const categoryDetails = Object.values(categories).map((cat) => {
      const auditRows = cat.items.map((it) => {
        const icon = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' }[it.result] || '•';
        const rowClass = { pass: 'row-pass', fail: 'row-fail', warn: 'row-warn', info: 'row-info' }[it.result] || '';
        return `
          <tr class="${rowClass}">
            <td class="icon-cell">${icon}</td>
            <td><strong>${it.title}</strong><br><span class="desc">${it.description}</span></td>
            <td class="details-cell">${it.details || ''}</td>
            <td class="result-badge result-${it.result}">${it.result.toUpperCase()}</td>
          </tr>`;
      }).join('');

      const grade = gradeScore(cat.score);
      return `
        <section class="category-section" id="cat-${cat.id}">
          <div class="category-header">
            <h2>${cat.title}</h2>
            <span class="score-badge score-${grade.color}">${cat.score}/100 (${grade.grade})</span>
          </div>
          <p class="category-desc">${cat.description || ''}</p>
          <table class="audit-table">
            <thead>
              <tr><th>Status</th><th>Audit</th><th>Details</th><th>Result</th></tr>
            </thead>
            <tbody>${auditRows}</tbody>
          </table>
        </section>`;
    }).join('');

    const screenshotSection = screenshot
      ? `<div class="screenshot-container"><img src="data:image/jpeg;base64,${screenshot}" alt="Page screenshot" class="screenshot"/></div>`
      : '';

    const navLinks = Object.values(categories).map((cat) =>
      `<a href="#cat-${cat.id}" class="nav-link">${cat.title} <span class="nav-score">${cat.score}</span></a>`
    ).join('');

    const passCount = Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'pass').length, 0);
    const failCount = Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'fail').length, 0);
    const warnCount = Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'warn').length, 0);
    const totalItems = Object.values(categories).reduce((s, c) => s + c.items.length, 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>WebAudit Report — ${url}</title>
  <style>
    :root {
      --green: #0cce6b; --yellow: #ffa400; --red: #ff4e42; --cyan: #00b0ff;
      --bg: #f8f9fa; --card: #ffffff; --border: #e0e0e0; --text: #202124;
      --text-muted: #5f6368; --radius: 8px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.6; }
    a { color: #1a73e8; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Header */
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 32px 40px; }
    .header-top { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .logo { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
    .logo span { color: #00b0ff; }
    .header h1 { font-size: 16px; font-weight: 400; opacity: 0.85; word-break: break-all; }
    .header-meta { margin-top: 12px; font-size: 12px; opacity: 0.7; display: flex; gap: 24px; flex-wrap: wrap; }
    .header-meta span { display: flex; align-items: center; gap: 4px; }

    /* Overall score */
    .overall-section { background: var(--card); border-bottom: 1px solid var(--border); padding: 32px 40px; display: flex; align-items: center; gap: 40px; flex-wrap: wrap; }
    .overall-gauge { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
    .overall-gauge .gauge-svg { width: 120px; height: 120px; }
    .overall-gauge .gauge-score { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 28px; font-weight: 800; }
    .overall-info h2 { font-size: 22px; font-weight: 700; }
    .overall-info p { color: var(--text-muted); margin-top: 4px; }
    .summary-stats { display: flex; gap: 20px; margin-top: 12px; flex-wrap: wrap; }
    .stat { background: var(--bg); border-radius: var(--radius); padding: 10px 20px; text-align: center; min-width: 80px; }
    .stat .stat-num { font-size: 24px; font-weight: 700; }
    .stat .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-pass .stat-num { color: var(--green); }
    .stat-fail .stat-num { color: var(--red); }
    .stat-warn .stat-num { color: var(--yellow); }

    /* Category cards */
    .categories-section { padding: 32px 40px; }
    .categories-section h2 { font-size: 18px; font-weight: 700; margin-bottom: 20px; }
    .categories-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .category-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; text-align: center; min-width: 140px; flex: 1; cursor: pointer; transition: box-shadow 0.2s; }
    .category-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .gauge { position: relative; width: 80px; height: 80px; margin: 0 auto 12px; }
    .gauge .gauge-svg { width: 80px; height: 80px; }
    .gauge .gauge-score { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: 700; }
    .category-title { font-weight: 600; font-size: 13px; }
    .category-grade { font-size: 11px; margin-top: 4px; }
    .grade-green { color: var(--green); }
    .grade-cyan { color: var(--cyan); }
    .grade-yellow { color: var(--yellow); }
    .grade-red { color: var(--red); }

    /* Navigation */
    .nav-bar { background: var(--card); border-bottom: 1px solid var(--border); padding: 0 40px; display: flex; gap: 0; overflow-x: auto; position: sticky; top: 0; z-index: 100; }
    .nav-link { padding: 14px 16px; font-size: 13px; font-weight: 500; color: var(--text-muted); border-bottom: 3px solid transparent; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .nav-link:hover { color: var(--text); text-decoration: none; border-bottom-color: #1a73e8; }
    .nav-score { background: var(--bg); border-radius: 12px; padding: 2px 7px; font-size: 11px; font-weight: 700; }

    /* Screenshot */
    .screenshot-container { padding: 0 40px 24px; }
    .screenshot { width: 100%; max-width: 900px; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

    /* Category sections */
    .details-section { padding: 0 40px 40px; }
    .category-section { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 24px; overflow: hidden; }
    .category-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); background: #fafafa; }
    .category-header h2 { font-size: 16px; font-weight: 700; }
    .category-desc { padding: 12px 24px; color: var(--text-muted); font-size: 13px; border-bottom: 1px solid var(--border); }
    .score-badge { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
    .score-green { background: #e6f9f0; color: #0a8a4a; }
    .score-cyan { background: #e3f2fd; color: #0277bd; }
    .score-yellow { background: #fff8e1; color: #e65100; }
    .score-red { background: #fce8e6; color: #c62828; }

    /* Audit table */
    .audit-table { width: 100%; border-collapse: collapse; }
    .audit-table th { background: #f1f3f4; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .audit-table td { padding: 12px 16px; border-bottom: 1px solid #f1f3f4; vertical-align: top; }
    .audit-table tr:last-child td { border-bottom: none; }
    .audit-table tr:hover td { background: #f8f9fa; }
    .icon-cell { width: 32px; text-align: center; font-size: 16px; }
    .details-cell { color: var(--text-muted); font-size: 13px; font-family: 'SFMono-Regular', Consolas, monospace; max-width: 400px; word-break: break-word; }
    .desc { font-size: 12px; color: var(--text-muted); font-weight: 400; }
    .result-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-align: center; white-space: nowrap; }
    .result-pass { background: #e6f9f0; color: #0a8a4a; }
    .result-fail { background: #fce8e6; color: #c62828; }
    .result-warn { background: #fff8e1; color: #e65100; }
    .result-info { background: #e8f0fe; color: #1a73e8; }
    .row-fail td { background: #fff8f8; }
    .row-warn td { background: #fffdf0; }

    /* Footer */
    .footer { text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px; border-top: 1px solid var(--border); margin-top: 20px; }

    @media (max-width: 768px) {
      .header, .overall-section, .categories-section, .nav-bar, .screenshot-container, .details-section { padding-left: 16px; padding-right: 16px; }
      .categories-grid { flex-direction: column; }
      .overall-section { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-top">
      <div class="logo">Web<span>Audit</span></div>
    </div>
    <h1>${url}</h1>
    <div class="header-meta">
      <span>📅 Audited: ${new Date(auditedAt).toLocaleString()}</span>
      <span>🌐 Status: HTTP ${statusCode}</span>
      <span>📄 Title: ${pageInfo.title || 'N/A'}</span>
      <span>🌍 Lang: ${pageInfo.lang || 'not set'}</span>
    </div>
  </header>

  <div class="overall-section">
    <div class="overall-gauge">
      <svg viewBox="0 0 120 120" class="gauge-svg">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" stroke-width="10"/>
        <circle cx="60" cy="60" r="54" fill="none" stroke="${HTMLReporter._gaugeColor(overallScore)}" stroke-width="10"
          stroke-dasharray="${HTMLReporter._dashArray(overallScore)}" stroke-dashoffset="0"
          transform="rotate(-90 60 60)"/>
      </svg>
      <div class="gauge-score" style="color:${HTMLReporter._gaugeColor(overallScore)}">${overallScore}</div>
    </div>
    <div class="overall-info">
      <h2>Overall Score: ${overallScore}/100 — ${overallGrade.label}</h2>
      <p>Comprehensive audit across ${Object.keys(categories).length} categories, ${totalItems} checks</p>
      <div class="summary-stats">
        <div class="stat stat-pass"><div class="stat-num">${passCount}</div><div class="stat-label">Passed</div></div>
        <div class="stat stat-fail"><div class="stat-num">${failCount}</div><div class="stat-label">Failed</div></div>
        <div class="stat stat-warn"><div class="stat-num">${warnCount}</div><div class="stat-label">Warnings</div></div>
        <div class="stat"><div class="stat-num">${totalItems}</div><div class="stat-label">Total Checks</div></div>
      </div>
    </div>
  </div>

  <div class="categories-section">
    <h2>Audit Categories</h2>
    <div class="categories-grid">${categoryCards}</div>
  </div>

  <nav class="nav-bar">${navLinks}</nav>

  ${screenshotSection}

  <div class="details-section">
    ${categoryDetails}
  </div>

  <footer class="footer">
    Generated by <strong>WebAudit</strong> — Headless Web Auditing Tool &nbsp;|&nbsp; ${new Date(auditedAt).toUTCString()}
  </footer>
</body>
</html>`;
  }

  static _gaugeColor(score) {
    if (score >= 90) return '#0cce6b';
    if (score >= 75) return '#00b0ff';
    if (score >= 50) return '#ffa400';
    return '#ff4e42';
  }

  static _dashArray(score) {
    const circumference = 2 * Math.PI * 54;
    const filled = (score / 100) * circumference;
    return `${filled.toFixed(1)} ${(circumference - filled).toFixed(1)}`;
  }
}

module.exports = HTMLReporter;
