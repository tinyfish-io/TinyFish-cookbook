import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateAnalysis, type AnalysisResult } from '@/lib/openrouter-client';
import type { ConceptData } from '@/types';

interface AnalysisPanelProps {
  userInput: string;
  projects: ConceptData[];
}

function getScoreBadge(score: number, type: 'competition' | 'validation' | 'maintenance') {
  // For competition: HIGH is bad. For validation/maintenance: HIGH is good.
  if (type === 'competition') {
    if (score >= 70) return { label: 'High', color: 'text-red-400', bg: 'bg-red-400/15', ring: 'ring-red-400/30', bar: 'bg-red-400' };
    if (score >= 40) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-400/15', ring: 'ring-yellow-400/30', bar: 'bg-yellow-400' };
    return { label: 'Low', color: 'text-green-400', bg: 'bg-green-400/15', ring: 'ring-green-400/30', bar: 'bg-green-400' };
  }
  // validation & maintenance: higher is better
  if (score >= 70) return { label: 'Strong', color: 'text-green-400', bg: 'bg-green-400/15', ring: 'ring-green-400/30', bar: 'bg-green-400' };
  if (score >= 40) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-400/15', ring: 'ring-yellow-400/30', bar: 'bg-yellow-400' };
  return { label: 'Weak', color: 'text-red-400', bg: 'bg-red-400/15', ring: 'ring-red-400/30', bar: 'bg-red-400' };
}

function getOverallBadge(score: number) {
  if (score >= 7.5) return { label: 'Highly Attractive', color: 'text-green-400', border: 'border-green-400/40' };
  if (score >= 5.0) return { label: 'Promising', color: 'text-yellow-400', border: 'border-yellow-400/40' };
  if (score >= 3.0) return { label: 'Risky', color: 'text-orange-400', border: 'border-orange-400/40' };
  return { label: 'Unfavorable', color: 'text-red-400', border: 'border-red-400/40' };
}

function ScoreBar({ label, score, type }: { label: string; score: number; type: 'competition' | 'validation' | 'maintenance' }) {
  const badge = getScoreBadge(score, type);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{score}/100</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${badge.bg} ${badge.color} ${badge.ring}`}>
            {badge.label}
          </span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${badge.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({ userInput, projects }: AnalysisPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchAnalysis() {
      try {
        console.log('[Analysis] Starting AI analysis...');
        const data = await generateAnalysis(userInput, projects);
        console.log('[Analysis] Received result:', data);
        setResult(data);
      } catch (err) {
        console.error('[Analysis] Error:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [userInput, projects]);

  if (error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-8 p-6 bg-card border border-primary/30 rounded-lg"
    >
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">AI Analysis</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Analyzing discovered projects...</span>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background/50 border border-border rounded-lg space-y-3">
              <ScoreBar label="Competition" score={result.scores.competition} type="competition" />
            </div>
            <div className="p-4 bg-background/50 border border-border rounded-lg space-y-3">
              <ScoreBar label="Market Validation" score={result.scores.validation} type="validation" />
            </div>
            <div className="p-4 bg-background/50 border border-border rounded-lg space-y-3">
              <ScoreBar label="Maintainability" score={result.scores.maintenance} type="maintenance" />
            </div>
          </div>

          {/* Overall Score */}
          {(() => {
            const badge = getOverallBadge(result.overall);
            return (
              <div className={`flex items-center justify-between p-4 border rounded-lg ${badge.border} bg-background/50`}>
                <div>
                  <span className="text-sm text-muted-foreground">Overall Idea Attractiveness</span>
                  <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ring-1 ring-current/30 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <span className={`text-2xl font-bold tabular-nums ${badge.color}`}>
                  {result.overall.toFixed(1)}<span className="text-base text-muted-foreground font-normal"> / 10</span>
                </span>
              </div>
            );
          })()}

          {/* Analysis Text */}
          <div
            className="text-sm text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none
              [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground
              [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(result.analysis) }}
          />
        </div>
      ) : null}
    </motion.div>
  );
}

/** Minimal markdown -> HTML for bold, lists, and paragraphs */
function markdownToHtml(md: string): string {
  return md
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      if (/^[-*] /.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `<li>${inlineFormat(l.replace(/^[-*]\s+/, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `<li>${inlineFormat(l.replace(/^\d+\.\s+/, ''))}</li>`)
          .join('');
        return `<ol>${items}</ol>`;
      }

      if (/^###?\s/.test(trimmed)) {
        return `<h3>${inlineFormat(trimmed.replace(/^###?\s+/, ''))}</h3>`;
      }

      return `<p>${inlineFormat(trimmed.replace(/\n/g, '<br/>'))}</p>`;
    })
    .join('');
}

function inlineFormat(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
