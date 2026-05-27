'use strict';

const { gradeScore } = require('../utils/scoring');

/**
 * JSONReporter — serialises the full audit results to a structured JSON format
 * suitable for programmatic consumption, CI/CD pipelines, and dashboards.
 */
class JSONReporter {
  static generate(results) {
    const { url, auditedAt, pageInfo, statusCode, overallScore, categories } = results;
    const overallGrade = gradeScore(overallScore);

    const categorySummaries = {};
    for (const [key, cat] of Object.entries(categories)) {
      const grade = gradeScore(cat.score);
      categorySummaries[key] = {
        id: cat.id,
        title: cat.title,
        score: cat.score,
        grade: grade.grade,
        label: grade.label,
        passCount: cat.items.filter((i) => i.result === 'pass').length,
        failCount: cat.items.filter((i) => i.result === 'fail').length,
        warnCount: cat.items.filter((i) => i.result === 'warn').length,
        items: cat.items,
      };
    }

    return {
      tool: 'WebAudit',
      version: '1.0.0',
      url,
      auditedAt,
      pageInfo,
      statusCode,
      overall: {
        score: overallScore,
        grade: overallGrade.grade,
        label: overallGrade.label,
      },
      categories: categorySummaries,
      summary: {
        totalChecks: Object.values(categories).reduce((s, c) => s + c.items.length, 0),
        passed: Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'pass').length, 0),
        failed: Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'fail').length, 0),
        warnings: Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'warn').length, 0),
      },
    };
  }
}

module.exports = JSONReporter;
