import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Lazy-load the CommonJS WebAudit runner
let AuditRunner: any = null;

function getRunner() {
  if (!AuditRunner) {
    AuditRunner = require(path.join(__dirname, "webaudit/core/runner.js"));
  }
  return AuditRunner;
}

export interface AuditResults {
  url: string;
  auditedAt: string;
  statusCode: number;
  pageInfo: { title: string; lang: string; description: string };
  overallScore: number;
  screenshot?: string;
  categories: Record<string, {
    id: string;
    title: string;
    description: string;
    score: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      result: "pass" | "fail" | "warn" | "info";
      details?: string;
    }>;
  }>;
}

export async function runAudit(url: string, timeoutMs = 60000): Promise<AuditResults> {
  const Runner = getRunner();
  // Pass TinyFish API key from environment so the runner can use it as primary collector
  const runner = new Runner({
    timeout: timeoutMs,
    tinyfishApiKey: process.env.TINYFISH_API_KEY || undefined,
  });
  const results = await runner.run(url);
  return results as AuditResults;
}
