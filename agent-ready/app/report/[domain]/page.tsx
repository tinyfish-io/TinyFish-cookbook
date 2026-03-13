import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getLatestAudit } from "@/app/lib/redis";
import ScoreCircle from "@/app/components/ScoreCircle";
import ShareButtons from "./ShareButtons";

export const dynamic = "force-dynamic";

interface TestData {
  name: string;
  description: string;
  icon: string;
  subscore?: number;
  passed: string[];
  failed: string[];
  issues: string[];
  fixes: string[];
}

interface PageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const audit = await getLatestAudit(decodedDomain);

  if (!audit) {
    return { title: "Report Not Found | AgentReady" };
  }

  const title = `${decodedDomain} scored ${audit.score}/100 | AgentReady`;
  const description = `${decodedDomain} received a ${audit.grade} rating (${audit.score}/100) for AI shopping agent compatibility. See the full breakdown.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "AgentReady",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const audit = await getLatestAudit(decodedDomain);

  if (!audit) {
    notFound();
  }

  const tests = audit.tests as Record<string, TestData>;
  const testEntries = Object.entries(tests);

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span className="text-cyan-400 text-lg">{"\u25C8"}</span>
            </div>
            <span className="font-semibold text-white tracking-tight">
              Agent<span className="text-cyan-400">Ready</span>
            </span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/leaderboard" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors">
              Leaderboard
            </a>
            <a href="/" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors">
              Run Audit
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Domain + Score */}
        <div className="flex flex-col items-center mb-10">
          <div className="text-sm text-gray-400 mb-1 font-mono">{decodedDomain}</div>
          <div className="text-xs text-gray-600 mb-4">
            Audited {new Date(audit.timestamp).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <ScoreCircle
            score={audit.score}
            grade={audit.grade}
            gradeColor={audit.gradeColor}
          />
          <div className="mt-4 text-sm text-gray-400">Agent Readiness Score</div>

          <ShareButtons
            domain={decodedDomain}
            auditData={{
              domain: decodedDomain,
              score: audit.score,
              grade: audit.grade,
              gradeColor: audit.gradeColor,
              tests: audit.tests,
              topFixes: audit.topFixes,
              timestamp: audit.timestamp,
            }}
          />
        </div>

        {/* Test Breakdown */}
        <div className="space-y-3 mb-10">
          {testEntries.map(([id, test]) => {
            const isPassing = (test.subscore ?? 0) >= 60;
            const statusColor = isPassing ? "#00E676" : "#FF1744";
            const statusBg = isPassing ? "rgba(0, 230, 118, 0.05)" : "rgba(255, 23, 68, 0.05)";

            return (
              <div
                key={id}
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: statusColor, backgroundColor: statusBg }}
              >
                {/* Card header */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{test.icon}</span>
                    <div>
                      <div className="font-semibold text-white text-sm">{test.name}</div>
                      <div className="text-xs text-gray-400">{test.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {test.subscore !== undefined && (
                      <span className="font-mono text-lg font-bold" style={{ color: statusColor }}>
                        {test.subscore}
                      </span>
                    )}
                    <span className="text-xs font-medium" style={{ color: statusColor }}>
                      {isPassing ? "Passed" : "Issues Found"}
                    </span>
                  </div>
                </div>

                {/* Always expanded details */}
                <div className="px-5 pb-4 border-t border-gray-800 pt-3 space-y-3">
                  {test.passed && test.passed.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Passed</div>
                      {test.passed.map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-green-400 py-0.5">
                          <span className="mt-0.5 shrink-0">{"\u2713"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {test.failed && test.failed.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Failed</div>
                      {test.failed.map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-red-400 py-0.5">
                          <span className="mt-0.5 shrink-0">{"\u2717"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {test.fixes && test.fixes.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">How to Fix</div>
                      {test.fixes.map((fix: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-amber-300 py-0.5">
                          <span className="mt-0.5 shrink-0">{"\u2192"}</span>
                          <span>{fix}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Fixes */}
        {audit.topFixes.length > 0 && (
          <div className="mb-10">
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-5 py-3 bg-gray-800/50 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white">
                  Priority Fixes ({audit.topFixes.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fix these issues to improve your Agent Readiness Score
                </p>
              </div>
              <div className="divide-y divide-gray-800/50">
                {audit.topFixes.map((fix: string, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-300">{fix}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 pt-6 border-t border-gray-800/50">
          <p>
            Generated by{" "}
            <a href="/" className="text-gray-500 hover:text-cyan-400 transition-colors">AgentReady</a>
            {" "}&middot;{" "}
            Powered by{" "}
            <a href="https://tinyfish.ai" className="text-gray-500 hover:text-cyan-400 transition-colors">TinyFish</a>
            {" "}+{" "}
            <a href="https://upstash.com" className="text-gray-500 hover:text-cyan-400 transition-colors">Redis</a>
          </p>
        </div>
      </main>
    </div>
  );
}
