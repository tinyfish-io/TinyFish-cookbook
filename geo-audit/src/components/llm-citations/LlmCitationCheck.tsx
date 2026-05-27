"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CircleCheck, CircleX, HelpCircle, Bot } from "lucide-react";
import type { LlmCitationCheckResult, ProviderCitationResult } from "@/lib/llm-citations";

function ProviderBadge({ result }: { result: ProviderCitationResult }) {
  if (!result.configured) {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <HelpCircle className="h-3 w-3" />
        Not configured
      </Badge>
    );
  }
  if (result.error) {
    return (
      <Badge variant="secondary" className="gap-1 font-normal text-destructive">
        <CircleX className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  return result.cited ? (
    <Badge className="gap-1 bg-success/20 text-success dark:bg-success/25">
      <CircleCheck className="h-3 w-3" />
      Cited
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1 font-normal text-muted-foreground">
      <CircleX className="h-3 w-3" />
      Not cited
    </Badge>
  );
}

interface LlmCitationCheckProps {
  url: string;
  /** Pre-fill with result from audit (e.g. when includeLlmCitations was true). */
  initialResult?: LlmCitationCheckResult | null;
  /** Error from audit when includeLlmCitations was requested but the check failed. */
  initialError?: string | null;
}

export function LlmCitationCheck({ url, initialResult, initialError }: LlmCitationCheckProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [result, setResult] = useState<LlmCitationCheckResult | null>(initialResult ?? null);

  useEffect(() => {
    if (initialResult != null) setResult(initialResult);
  }, [initialResult]);
  useEffect(() => {
    if (initialError != null) setError(initialError);
  }, [initialError]);

  async function runCheck() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/audit/llm-citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Check failed");
        return;
      }
      setResult(data as LlmCitationCheckResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          LLM citation check
        </CardTitle>
        <CardDescription>
          See if OpenAI, Gemini, and Claude mention or recommend your site when asked relevant questions. This is the &quot;second layer&quot; of GEO: beyond on-site readiness.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runCheck}
          disabled={loading || !url.trim()}
          variant="default"
          className="rounded-lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Check if AI models cite this site
            </>
          )}
        </Button>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {result ? (
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Checking for <strong className="text-foreground">{result.brand}</strong> ({result.domain}) in model responses.
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              {result.summary.openai.total > 0 ? (
                <span>
                  <strong>OpenAI:</strong> {result.summary.openai.cited}/{result.summary.openai.total} cited
                </span>
              ) : null}
              {result.summary.gemini.total > 0 ? (
                <span>
                  <strong>Gemini:</strong> {result.summary.gemini.cited}/{result.summary.gemini.total} cited
                </span>
              ) : null}
              {result.summary.claude.total > 0 ? (
                <span>
                  <strong>Claude:</strong> {result.summary.claude.cited}/{result.summary.claude.total} cited
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              {result.topics.map((topicResult, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-card p-3 text-sm"
                >
                  <p className="mb-2 font-medium text-muted-foreground">&quot;{topicResult.query}&quot;</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
                      <span className="font-medium">OpenAI:</span>
                      <ProviderBadge result={topicResult.openai} />
                    </div>
                    <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
                      <span className="font-medium">Gemini:</span>
                      <ProviderBadge result={topicResult.gemini} />
                    </div>
                    <div className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1">
                      <span className="font-medium">Claude:</span>
                      <ProviderBadge result={topicResult.claude} />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {topicResult.openai.snippet ? (
                      <p className="text-xs text-muted-foreground"><strong>OpenAI:</strong> {topicResult.openai.snippet}</p>
                    ) : null}
                    {topicResult.gemini.snippet ? (
                      <p className="text-xs text-muted-foreground"><strong>Gemini:</strong> {topicResult.gemini.snippet}</p>
                    ) : null}
                    {topicResult.claude.snippet ? (
                      <p className="text-xs text-muted-foreground"><strong>Claude:</strong> {topicResult.claude.snippet}</p>
                    ) : null}
                    {(topicResult.openai.error ?? topicResult.gemini.error ?? topicResult.claude.error) ? (
                      <p className="text-xs text-destructive">
                        {[topicResult.openai.error, topicResult.gemini.error, topicResult.claude.error].filter(Boolean).join("; ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
