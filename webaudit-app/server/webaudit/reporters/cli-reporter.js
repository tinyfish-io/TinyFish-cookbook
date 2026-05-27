'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { gradeScore } = require('../utils/scoring');

/**
 * CLIReporter — renders a rich terminal report using chalk colours and
 * cli-table3 tables. Mimics the Lighthouse CLI output style.
 */
class CLIReporter {
  static print(results) {
    const { url, auditedAt, pageInfo, statusCode, overallScore, categories } = results;
    const overallGrade = gradeScore(overallScore);

    console.log('\n' + chalk.bold.bgBlue.white('  WebAudit  ') + chalk.bold(' — Headless Web Auditing Tool'));
    console.log(chalk.dim('─'.repeat(70)));

    // Page info
    console.log(chalk.bold('URL:      ') + chalk.cyan(url));
    console.log(chalk.bold('Title:    ') + (pageInfo.title || chalk.dim('N/A')));
    console.log(chalk.bold('Status:   ') + CLIReporter._statusColor(statusCode));
    console.log(chalk.bold('Audited:  ') + new Date(auditedAt).toLocaleString());
    console.log(chalk.dim('─'.repeat(70)));

    // Overall score
    const scoreColor = CLIReporter._scoreColor(overallScore);
    console.log('\n' + chalk.bold('OVERALL SCORE'));
    console.log(scoreColor(`  ${overallScore}/100`) + chalk.bold(` — ${overallGrade.label} (${overallGrade.grade})`));

    // Category scores summary
    console.log('\n' + chalk.bold('CATEGORY SCORES'));
    const summaryTable = new Table({
      head: [chalk.bold('Category'), chalk.bold('Score'), chalk.bold('Grade'), chalk.bold('Pass'), chalk.bold('Fail'), chalk.bold('Warn')],
      colWidths: [22, 10, 20, 8, 8, 8],
      style: { head: [], border: ['dim'] },
    });

    for (const cat of Object.values(categories)) {
      const grade = gradeScore(cat.score);
      const scoreStr = CLIReporter._scoreColor(cat.score)(`${cat.score}/100`);
      const gradeStr = CLIReporter._scoreColor(cat.score)(`${grade.grade} — ${grade.label}`);
      const pass = cat.items.filter((i) => i.result === 'pass').length;
      const fail = cat.items.filter((i) => i.result === 'fail').length;
      const warn = cat.items.filter((i) => i.result === 'warn').length;
      summaryTable.push([
        chalk.bold(cat.title),
        scoreStr,
        gradeStr,
        chalk.green(pass),
        fail > 0 ? chalk.red(fail) : chalk.dim(fail),
        warn > 0 ? chalk.yellow(warn) : chalk.dim(warn),
      ]);
    }
    console.log(summaryTable.toString());

    // Detailed results per category
    for (const cat of Object.values(categories)) {
      const grade = gradeScore(cat.score);
      console.log('\n' + chalk.bold.underline(`${cat.title.toUpperCase()}`) + ' ' + CLIReporter._scoreColor(cat.score)(`[${cat.score}/100 — ${grade.grade}]`));

      const detailTable = new Table({
        head: [chalk.bold(''), chalk.bold('Audit'), chalk.bold('Details'), chalk.bold('Result')],
        colWidths: [4, 38, 38, 10],
        style: { head: [], border: ['dim'] },
        wordWrap: true,
      });

      for (const it of cat.items) {
        const icon = { pass: chalk.green('✔'), fail: chalk.red('✘'), warn: chalk.yellow('⚠'), info: chalk.blue('i') }[it.result] || '•';
        const resultStr = { pass: chalk.green('PASS'), fail: chalk.red('FAIL'), warn: chalk.yellow('WARN'), info: chalk.blue('INFO') }[it.result] || it.result;
        detailTable.push([icon, chalk.bold(it.title), it.details || '', resultStr]);
      }
      console.log(detailTable.toString());
    }

    // Summary footer
    const totalItems = Object.values(categories).reduce((s, c) => s + c.items.length, 0);
    const passCount = Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'pass').length, 0);
    const failCount = Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'fail').length, 0);
    const warnCount = Object.values(categories).reduce((s, c) => s + c.items.filter((i) => i.result === 'warn').length, 0);

    console.log('\n' + chalk.dim('─'.repeat(70)));
    console.log(chalk.bold('SUMMARY: ') +
      `${totalItems} checks — ` +
      chalk.green(`${passCount} passed`) + ', ' +
      chalk.red(`${failCount} failed`) + ', ' +
      chalk.yellow(`${warnCount} warnings`));
    console.log(chalk.dim('─'.repeat(70)) + '\n');
  }

  static _scoreColor(score) {
    if (score >= 90) return chalk.green;
    if (score >= 75) return chalk.cyan;
    if (score >= 50) return chalk.yellow;
    return chalk.red;
  }

  static _statusColor(code) {
    if (code >= 200 && code < 300) return chalk.green(`${code} OK`);
    if (code >= 300 && code < 400) return chalk.yellow(`${code} Redirect`);
    return chalk.red(`${code} Error`);
  }
}

module.exports = CLIReporter;
