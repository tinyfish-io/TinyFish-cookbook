"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Clock, Layers, FileText } from "lucide-react";

type HistoryItem = {
  id: string;
  url: string;
  score: number | null;
  consistencyScore?: number | null;
  createdAt: string;
  status: string;
  type: "single" | "multi";
};

type HistoryResponse = {
  audits: HistoryItem[];
  total: number;
};

interface AuditHistoryProps {
  url: string;
  limit?: number;
}

export function AuditHistory({ url, limit = 10 }: AuditHistoryProps) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;

    let active = true;
    let requestFinished = false;
    queueMicrotask(() => {
      if (active && !requestFinished) {
        setLoading(true);
      }
    });
    fetch(`/api/audit/history?url=${encodeURIComponent(url)}&limit=${limit}`)
      .then((res) => res.json().catch(() => ({ audits: [], total: 0 })))
      .then((result) => {
        setData(Array.isArray((result as HistoryResponse).audits) ? (result as HistoryResponse) : { audits: [], total: 0 });
      })
      .catch((err) => {
        console.error("Error fetching history:", err);
        setData({ audits: [], total: 0 });
      })
      .finally(() => {
        requestFinished = true;
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit History</CardTitle>
          <CardDescription>Loading past audits...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  const audits = data?.audits ?? [];
  if (!data || audits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit History</CardTitle>
          <CardDescription>Past audit results for this URL</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Clock className="mx-auto mb-2 h-10 w-10 opacity-50" />
            <p className="font-medium">No previous audits for this URL</p>
            <p className="mt-1 text-sm">History appears here after audits are saved.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend if we have multiple audits
  const hasTrend = audits.length >= 2;
  const latestScore = audits[0]?.score ?? 0;
  const previousScore = audits[1]?.score ?? 0;
  const scoreTrend = hasTrend ? latestScore - previousScore : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Audit History</CardTitle>
            <CardDescription>Past {audits.length} audit(s) for this URL</CardDescription>
          </div>
          {hasTrend && scoreTrend !== 0 && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
              {scoreTrend > 0 ? "+" : ""}{scoreTrend} pts since last audit
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {audits.map((audit, index) => {
            const isLatest = index === 0;
            const timeAgo = formatDistanceToNow(new Date(audit.createdAt), { addSuffix: true });

            return (
              <div
                key={audit.id}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  isLatest ? "bg-muted/50" : "bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    {audit.type === "multi" ? (
                      <Layers className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {audit.type === "multi" ? "Multi-page Audit" : "Single-page Audit"}
                      </p>
                      {isLatest && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {timeAgo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {audit.type === "multi" && audit.consistencyScore !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Consistency</p>
                      <p className="text-lg font-semibold">{audit.consistencyScore}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-2xl font-semibold">
                      {audit.score ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
