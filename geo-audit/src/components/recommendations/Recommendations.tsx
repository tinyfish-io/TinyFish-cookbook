"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Target } from "lucide-react";

type Recommendation = {
  id: string;
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  estimatedPoints: number;
  priority: number;
  category: string;
  actionItems: string[];
};

type RecommendationsResponse = {
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    potentialPoints: number;
    highImpactCount: number;
  };
};

type QuestionInput = {
  question: string;
  answeredInDocs: string;
  partialAnswer: string | null;
  importance: string;
};

type LlmoFindingInput = {
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  actionItems: string[];
};

interface RecommendationsProps {
  runId?: string;
  sessionId?: string;
  questions?: QuestionInput[];
  llmoFindings?: LlmoFindingInput[];
}

const IMPACT_CONFIG = {
  HIGH: {
    label: "High Impact",
    className: "bg-destructive/15 text-destructive dark:bg-destructive/20",
  },
  MEDIUM: {
    label: "Medium Impact",
    className: "bg-warning/15 text-warning dark:bg-warning/20",
  },
  LOW: {
    label: "Low Impact",
    className: "bg-primary/15 text-primary dark:bg-primary/20",
  },
};

function RecommendationItem({ recommendation }: { recommendation: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const impactConfig = IMPACT_CONFIG[recommendation.impact];
  const cardAccent =
    recommendation.impact === "HIGH"
      ? "border-l-destructive/70 bg-destructive/[0.03]"
      : recommendation.impact === "MEDIUM"
        ? "border-l-warning/70 bg-warning/[0.03]"
        : "border-l-primary/60 bg-primary/[0.03]";

  return (
    <div className={`rounded-md border border-border border-l-4 p-4 ${cardAccent}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold">{recommendation.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{recommendation.description}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge className={impactConfig.className}>{impactConfig.label}</Badge>
              <span className="text-xs font-medium text-muted-foreground">
                +{recommendation.estimatedPoints} pts
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {recommendation.category}
            </Badge>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <>
                  Hide details <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show action items <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>

          {expanded && (
            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">Action Items:</p>
              <ul className="space-y-2">
                {recommendation.actionItems.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Recommendations({
  runId,
  sessionId,
  questions,
  llmoFindings,
}: RecommendationsProps) {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const useQuestions = Array.isArray(questions) && questions.length > 0;
    if (!useQuestions && !runId && !sessionId) return;

    const controller = new AbortController();
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;
    const setErrorIfCurrent = (message: string) => {
      if (thisRequestId === requestIdRef.current) {
        setError(message);
      }
    };
    let requestFinished = false;
    queueMicrotask(() => {
      if (thisRequestId === requestIdRef.current && !requestFinished) {
        setLoading(true);
        setError(null);
      }
    });

    if (useQuestions) {
      fetch("/api/audit/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, llmoFindings }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (thisRequestId !== requestIdRef.current) return null;
          const body = await res.json().catch(() => ({}));
          if (thisRequestId !== requestIdRef.current) return null;
          if (!res.ok) {
            setErrorIfCurrent((body as { error?: string })?.error ?? `Recommendations unavailable (${res.status})`);
            return null;
          }
          return body as RecommendationsResponse;
        })
        .then((result) => {
          if (thisRequestId !== requestIdRef.current || !result) return;
          setData(result);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          if (thisRequestId !== requestIdRef.current) return;
          console.error("Error fetching recommendations:", err);
          setErrorIfCurrent(err instanceof Error ? err.message : "Failed to load recommendations");
        })
        .finally(() => {
          requestFinished = true;
          if (thisRequestId === requestIdRef.current) {
            setLoading(false);
          }
        });
    } else {
      const params = new URLSearchParams();
      if (runId) params.set("runId", runId);
      if (sessionId) params.set("sessionId", sessionId);

      fetch(`/api/audit/recommendations?${params.toString()}`, { signal: controller.signal })
        .then(async (res) => {
          if (thisRequestId !== requestIdRef.current) return null;
          const body = await res.json().catch(() => ({}));
          if (thisRequestId !== requestIdRef.current) return null;
          if (!res.ok) {
            setErrorIfCurrent((body as { error?: string })?.error ?? `Recommendations unavailable (${res.status})`);
            return null;
          }
          return body as RecommendationsResponse;
        })
        .then((result) => {
          if (thisRequestId !== requestIdRef.current || !result) return;
          setData(result);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          if (thisRequestId !== requestIdRef.current) return;
          console.error("Error fetching recommendations:", err);
          setErrorIfCurrent(err instanceof Error ? err.message : "Failed to load recommendations");
        })
        .finally(() => {
          requestFinished = true;
          if (thisRequestId === requestIdRef.current) {
            setLoading(false);
          }
        });
    }

    return () => controller.abort();
  }, [runId, sessionId, questions, llmoFindings]);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl font-bold">AI Recommendations</CardTitle>
          <CardDescription>Loading actionable suggestions...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Analyzing audit results...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl font-bold">AI Recommendations</CardTitle>
          <CardDescription>Recommendations aren&apos;t available for this run</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">{error || "No recommendations available"}</p>
            <p className="mt-1 text-sm">This can happen if the audit wasn&apos;t saved or the service is temporarily unavailable.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.recommendations.length === 0) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl font-bold">AI Recommendations</CardTitle>
          <CardDescription>Your audit looks great!</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Target className="size-8 text-success" />
            </div>
            <p className="font-bold text-foreground">Excellent Performance</p>
            <p className="text-sm text-muted-foreground">
              No critical improvements needed at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">AI Recommendations</CardTitle>
            <CardDescription>Prioritized actions to improve your score</CardDescription>
          </div>
          <div className="flex gap-3">
            <div className="rounded-md border border-border bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">Potential Gain</p>
              <p className="text-lg font-semibold">
                +{data.summary.potentialPoints} pts
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">High Impact</p>
              <p className="text-lg font-semibold">{data.summary.highImpactCount}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.recommendations.map((recommendation) => (
            <RecommendationItem key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
