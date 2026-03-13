"use client";

import { useState } from "react";

interface ShareButtonsProps {
  domain: string;
  auditData: {
    domain: string;
    score: number;
    grade: string;
    gradeColor: string;
    tests: Record<string, unknown>;
    topFixes: string[];
    timestamp: string;
  };
}

export default function ShareButtons({ domain, auditData }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { generateAuditPDF } = await import("@/app/lib/pdf-report");
      const tests = auditData.tests as Record<
        string,
        {
          name: string;
          icon: string;
          subscore?: number;
          passed: string[];
          failed: string[];
          fixes: string[];
        }
      >;
      await generateAuditPDF({
        domain: auditData.domain,
        score: auditData.score,
        grade: auditData.grade,
        gradeColor: auditData.gradeColor,
        tests: Object.values(tests).map((t) => ({
          name: t.name,
          icon: t.icon,
          status: (t.subscore ?? 0) >= 60 ? "pass" : "fail",
          subscore: t.subscore,
          passed: t.passed || [],
          failed: t.failed || [],
          fixes: t.fixes || [],
        })),
        topFixes: auditData.topFixes,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      domain: auditData.domain,
      score: auditData.score,
      grade: auditData.grade,
      tests: auditData.tests,
      topFixes: auditData.topFixes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentready-${domain}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      <button
        onClick={handleCopyLink}
        className="px-4 py-2 border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 rounded-lg text-sm transition-colors flex items-center gap-2"
      >
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 4L6 11L3 8" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="8" height="8" rx="1" />
              <path d="M3 11V3h8" />
            </svg>
            Copy Link
          </>
        )}
      </button>

      <button
        onClick={handleDownloadPDF}
        disabled={isGeneratingPDF}
        className="px-4 py-2 border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {isGeneratingPDF ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" />
            </svg>
            Download PDF
          </>
        )}
      </button>

      <button
        onClick={handleExportJSON}
        className="px-4 py-2 border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 rounded-lg text-sm transition-colors flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M9 2v4h4" />
        </svg>
        Export JSON
      </button>
    </div>
  );
}
