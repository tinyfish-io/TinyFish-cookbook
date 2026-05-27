#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const AuditRunner = require('./core/runner');
const CLIReporter = require('./reporters/cli-reporter');
const HTMLReporter = require('./reporters/html-reporter');
const JSONReporter = require('./reporters/json-reporter');

const pkg = require('../package.json');

program
  .name('webaudit')
  .description('Headless web auditing CLI — Performance, Accessibility, SEO, Best Practices, Security & Compliance')
  .version(pkg.version)
  .requiredOption('-u, --url <url>', 'URL to audit (must include http:// or https://)')
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .option('-f, --format <formats>', 'Report formats: html,json,cli (comma-separated)', 'html,json,cli')
  .option('--timeout <ms>', 'Navigation timeout in milliseconds', '30000')
  .option('--no-screenshot', 'Skip page screenshot in HTML report')
  .option('--categories <list>', 'Comma-separated categories to run: performance,accessibility,seo,best-practices,security,compliance', 'performance,accessibility,seo,best-practices,security,compliance')
  .option('--threshold <score>', 'Exit with code 1 if overall score is below this value', '0')
  .addHelpText('after', `
Examples:
  $ node src/index.js --url https://example.com
  $ node src/index.js --url https://example.com --format html,json --output ./my-reports
  $ node src/index.js --url https://example.com --threshold 70
  $ node src/index.js --url https://example.com --categories security,compliance
  `);

program.parse(process.argv);
const opts = program.opts();

// Validate URL
let targetUrl = opts.url;
if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
  targetUrl = 'https://' + targetUrl;
}

const formats = opts.format.split(',').map((f) => f.trim().toLowerCase());
const outputDir = path.resolve(opts.output);
const timeout = parseInt(opts.timeout) || 30000;
const threshold = parseInt(opts.threshold) || 0;

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate filename base from URL
const urlSlug = targetUrl
  .replace(/https?:\/\//, '')
  .replace(/[^a-zA-Z0-9.-]/g, '_')
  .replace(/_+/g, '_')
  .substring(0, 60);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const fileBase = `${urlSlug}_${timestamp}`;

async function main() {
  console.log('\n' + chalk.bold.bgBlue.white('  WebAudit  ') + chalk.bold(` v${pkg.version}`));
  console.log(chalk.dim('Headless Web Auditing Tool — Performance, Accessibility, SEO, Security & Compliance'));
  console.log(chalk.dim('─'.repeat(70)));
  console.log(chalk.bold('Target: ') + chalk.cyan(targetUrl));
  console.log(chalk.bold('Output: ') + outputDir);
  console.log(chalk.bold('Formats: ') + formats.join(', '));
  console.log('');

  const spinner = ora({ text: 'Launching headless browser...', color: 'blue' }).start();

  try {
    const runner = new AuditRunner({ timeout });

    spinner.text = 'Loading page and collecting data...';
    const results = await runner.run(targetUrl);

    spinner.succeed(chalk.green('Audit complete!'));

    // CLI output
    if (formats.includes('cli')) {
      CLIReporter.print(results);
    }

    // HTML report
    if (formats.includes('html')) {
      const htmlContent = HTMLReporter.generate(results);
      const htmlPath = path.join(outputDir, `${fileBase}.html`);
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log(chalk.green('✔') + ' HTML report: ' + chalk.cyan(htmlPath));
    }

    // JSON report
    if (formats.includes('json')) {
      const jsonContent = JSONReporter.generate(results);
      const jsonPath = path.join(outputDir, `${fileBase}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
      console.log(chalk.green('✔') + ' JSON report: ' + chalk.cyan(jsonPath));
    }

    console.log('');
    console.log(chalk.bold('Overall Score: ') + scoreLabel(results.overallScore));

    // Threshold check for CI/CD
    if (threshold > 0 && results.overallScore < threshold) {
      console.log(chalk.red(`\n✘ Score ${results.overallScore} is below threshold ${threshold}. Exiting with code 1.`));
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    spinner.fail(chalk.red('Audit failed: ' + err.message));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

function scoreLabel(score) {
  if (score >= 90) return chalk.green(`${score}/100 — Excellent`);
  if (score >= 75) return chalk.cyan(`${score}/100 — Good`);
  if (score >= 50) return chalk.yellow(`${score}/100 — Needs Improvement`);
  return chalk.red(`${score}/100 — Poor`);
}

main();
