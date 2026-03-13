"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImportanceStats = {
  score: number;
  clarityIndex: number;
  total: number;
  answered: number;
  partial: number;
  missing: number;
};

type ImportanceBreakdown = {
  high: ImportanceStats;
  medium: ImportanceStats;
};

interface ScoreRadarChartProps {
  importanceBreakdown: ImportanceBreakdown;
  overallScore: number;
  clarityIndex: number;
}

export function ScoreRadarChart({
  importanceBreakdown,
  overallScore,
  clarityIndex,
}: ScoreRadarChartProps) {
  // Calculate completion percentages for radar axes
  const highCompletion = importanceBreakdown.high.total > 0
    ? Math.round(
        ((importanceBreakdown.high.answered + importanceBreakdown.high.partial * 0.5) /
          importanceBreakdown.high.total) *
          100
      )
    : 0;

  const mediumCompletion = importanceBreakdown.medium.total > 0
    ? Math.round(
        ((importanceBreakdown.medium.answered + importanceBreakdown.medium.partial * 0.5) /
          importanceBreakdown.medium.total) *
          100
      )
    : 0;

  const radarData = [
    {
      metric: "Overall Score",
      value: overallScore,
      fullMark: 100,
    },
    {
      metric: "Clarity Index",
      value: clarityIndex,
      fullMark: 100,
    },
    {
      metric: "High Priority",
      value: importanceBreakdown.high.score,
      fullMark: 100,
    },
    {
      metric: "High Completion",
      value: highCompletion,
      fullMark: 100,
    },
    {
      metric: "Medium Priority",
      value: importanceBreakdown.medium.score,
      fullMark: 100,
    },
    {
      metric: "Medium Completion",
      value: mediumCompletion,
      fullMark: 100,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score Breakdown</CardTitle>
        <CardDescription>
          Performance across dimensions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.5}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number | undefined) => [`${value ?? 0}/100`, "Score"]}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-semibold">{overallScore}</p>
            <p className="text-xs text-muted-foreground">Overall Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{clarityIndex}%</p>
            <p className="text-xs text-muted-foreground">Clarity Index</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{importanceBreakdown.high.score}</p>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{highCompletion}%</p>
            <p className="text-xs text-muted-foreground">High Completion</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{importanceBreakdown.medium.score}</p>
            <p className="text-xs text-muted-foreground">Medium Priority</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{mediumCompletion}%</p>
            <p className="text-xs text-muted-foreground">Medium Completion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
