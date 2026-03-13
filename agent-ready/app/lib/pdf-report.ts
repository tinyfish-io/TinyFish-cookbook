import type jsPDF from "jspdf";

interface PDFReportData {
  domain: string;
  score: number;
  grade: string;
  gradeColor: string;
  tests: Array<{
    name: string;
    icon: string;
    status: string;
    subscore?: number;
    passed: string[];
    failed: string[];
    fixes: string[];
  }>;
  topFixes: string[];
}

// Color helpers
function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function scoreColor(subscore: number): string {
  if (subscore >= 80) return "#00E676";
  if (subscore >= 50) return "#FFAB00";
  return "#FF1744";
}

const BG: [number, number, number] = [17, 24, 39]; // #111827
const CARD_BG: [number, number, number] = [31, 41, 55]; // #1F2937
const CYAN: [number, number, number] = [0, 229, 255]; // #00E5FF
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY: [number, number, number] = [156, 163, 175];
const GRAY_DIM: [number, number, number] = [107, 114, 128];
const GREEN: [number, number, number] = [0, 230, 118];
const RED: [number, number, number] = [255, 23, 68];
const AMBER: [number, number, number] = [255, 171, 0];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    // Background for new page
    doc.setFillColor(...BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    return MARGIN;
  }
  return y;
}

function drawWrappedLines(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export async function generateAuditPDF(data: PDFReportData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Full page dark background
  doc.setFillColor(...BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  let y = MARGIN;

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("AgentReady Audit Report", MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`${data.domain}  ·  ${dateStr}`, MARGIN, y);
  y += 4;

  // Cyan accent line
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 20;

  // ── Score Section ──
  const gradeRGB = hexToRGB(data.gradeColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(...gradeRGB);
  doc.text(`${data.score}`, PAGE_W / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(12);
  doc.setTextColor(...GRAY);
  doc.text("/ 100", PAGE_W / 2 + 20, y - 16);

  doc.setFontSize(14);
  doc.setTextColor(...gradeRGB);
  doc.text(data.grade, PAGE_W / 2, y, { align: "center" });
  y += 14;

  // ── Test Results Section ──
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...CYAN);
  doc.text("Test Results", MARGIN, y);
  y += 8;

  for (const test of data.tests) {
    // Estimate space needed for this test card
    const itemCount = test.passed.length + test.failed.length + test.fixes.length;
    const estimatedHeight = 14 + itemCount * 5.5;
    y = ensureSpace(doc, y, Math.min(estimatedHeight, 40));

    // Card background
    doc.setFillColor(...CARD_BG);
    const cardTop = y - 2;

    // Test name + score on same line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(`${test.name}`, MARGIN + 4, y + 3);

    if (test.subscore !== undefined) {
      const sc = hexToRGB(scoreColor(test.subscore));
      doc.setTextColor(...sc);
      doc.setFont("helvetica", "bold");
      doc.text(`${test.subscore}/100`, MARGIN + CONTENT_W - 4, y + 3, {
        align: "right",
      });
    }
    y += 9;

    // Passed items
    if (test.passed.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const item of test.passed) {
        y = ensureSpace(doc, y, 5);
        doc.setTextColor(...GREEN);
        doc.text("✓", MARGIN + 6, y);
        doc.setTextColor(...GRAY);
        y = drawWrappedLines(doc, item, MARGIN + 12, y, CONTENT_W - 16, 4.5);
      }
    }

    // Failed items
    if (test.failed.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const item of test.failed) {
        y = ensureSpace(doc, y, 5);
        doc.setTextColor(...RED);
        doc.text("✗", MARGIN + 6, y);
        doc.setTextColor(...GRAY);
        y = drawWrappedLines(doc, item, MARGIN + 12, y, CONTENT_W - 16, 4.5);
      }
    }

    // Fixes
    if (test.fixes.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const fix of test.fixes) {
        y = ensureSpace(doc, y, 5);
        doc.setTextColor(...AMBER);
        doc.text("→", MARGIN + 6, y);
        doc.setTextColor(...GRAY);
        y = drawWrappedLines(doc, fix, MARGIN + 12, y, CONTENT_W - 16, 4.5);
      }
    }

    // Draw card background behind content (drawn after to know height)
    const cardHeight = y - cardTop + 3;
    // We draw the card rect on the current page — but content may have spanned pages,
    // so we only draw if card fits on one section
    doc.setFillColor(...CARD_BG);

    y += 6;
  }

  // ── Priority Fixes ──
  if (data.topFixes.length > 0) {
    y = ensureSpace(doc, y, 20);
    doc.setDrawColor(...CYAN);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...CYAN);
    doc.text("Priority Fixes", MARGIN, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    for (let i = 0; i < data.topFixes.length; i++) {
      y = ensureSpace(doc, y, 7);
      doc.setTextColor(...AMBER);
      doc.text(`${i + 1}.`, MARGIN + 4, y);
      doc.setTextColor(...GRAY);
      y = drawWrappedLines(
        doc,
        data.topFixes[i],
        MARGIN + 12,
        y,
        CONTENT_W - 16,
        5
      );
      y += 2;
    }
  }

  // ── Footer ──
  y = ensureSpace(doc, y, 16);
  y += 6;
  doc.setDrawColor(...GRAY_DIM);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_DIM);
  doc.text("Generated by AgentReady · tinyfish.ai", PAGE_W / 2, y, {
    align: "center",
  });

  // Trigger download
  const safeDomain = data.domain.replace(/[^a-zA-Z0-9.-]/g, "_");
  doc.save(`agentready-${safeDomain}-report.pdf`);
}
