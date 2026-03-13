"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TrendDataPoint = {
  date: string;
  timestamp: string;
  score: number;
  clarityIndex: number;
  answered: number;
  partial: number;
  missing: number;
  highImportance: number;
  consistencyScore?: number;
};

type TrendResponse = {
  timeframe: string;
  data: TrendDataPoint[];
  summary: {
    totalAudits: number;
    averageScore: number;
    trend: number;
  };
};

interface ScoreTrendChartProps {
  url: string;
}

export function ScoreTrendChart({ url }: ScoreTrendChartProps) {
  const [data, setData] = useState<TrendResponse | null>(null);
  const [timeframe, setTimeframe] = useState("30d");
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
    fetch(`/api/audit/trends?url=${encodeURIComponent(url)}&timeframe=${timeframe}`)
      .then((res) => res.json().catch(() => ({ timeframe, data: [], summary: { totalAudits: 0, averageScore: 0, trend: 0 } })))
      .then((result) => {
        const trend = result as TrendResponse;
        setData(
          trend && Array.isArray(trend.data) && trend.summary
            ? trend
            : { timeframe: timeframe, data: [], summary: { totalAudits: 0, averageScore: 0, trend: 0 } }
        );
      })
      .catch((err) => {
        console.error("Error fetching trends:", err);
        setData({ timeframe: timeframe, data: [], summary: { totalAudits: 0, averageScore: 0, trend: 0 } });
      })
      .finally(() => {
        requestFinished = true;
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, timeframe]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Trends</CardTitle>
          <CardDescription>Historical performance data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading trends...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !Array.isArray(data.data) || data.data.length === 0 || !data.summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Trends</CardTitle>
          <CardDescription>Historical performance data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No historical data available</p>
            <p className="text-sm">Run more audits to see trends over time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendColor =
    data.summary.trend > 0
      ? "text-success"
      : data.summary.trend < 0
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Score Trends</CardTitle>
            <CardDescription>Track GEO score over time</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
              {data.summary.trend > 0 ? "+" : ""}
              {data.summary.trend} pts
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading trends...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                domain={[0, 100]}
                className="text-xs text-muted-foreground"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
                name="GEO Score"
              />
              <Line
                type="monotone"
                dataKey="clarityIndex"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))", r: 3 }}
                name="Clarity Index"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
          <div className="text-center">
            <p className="text-2xl font-semibold">{data.summary.totalAudits}</p>
            <p className="text-xs text-muted-foreground">Total Audits</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{data.summary.averageScore}</p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-semibold ${trendColor}`}>
              {data.summary.trend > 0 ? "+" : ""}
              {data.summary.trend}
            </p>
            <p className="text-xs text-muted-foreground">Score Change</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
