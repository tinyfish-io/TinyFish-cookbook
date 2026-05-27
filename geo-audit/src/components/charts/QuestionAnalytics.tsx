"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleCheck, CircleAlert, CircleX } from "lucide-react";

type AuditQuestion = {
  answeredInDocs: "YES" | "NO" | "PARTIAL";
  importance: "HIGH" | "MEDIUM";
};

interface QuestionAnalyticsProps {
  questions: AuditQuestion[];
}

const STATUS_COLORS = {
  YES: "#0d9488", // teal/success
  PARTIAL: "#b45309", // warning
  NO: "#c2414a", // destructive
};

export function QuestionAnalytics({ questions }: QuestionAnalyticsProps) {
  // Calculate status distribution
  const statusDistribution = {
    answered: questions.filter((q) => q.answeredInDocs === "YES").length,
    partial: questions.filter((q) => q.answeredInDocs === "PARTIAL").length,
    missing: questions.filter((q) => q.answeredInDocs === "NO").length,
  };

  // Calculate importance breakdown
  const highImportance = questions.filter((q) => q.importance === "HIGH");
  const mediumImportance = questions.filter((q) => q.importance === "MEDIUM");

  const highBreakdown = {
    answered: highImportance.filter((q) => q.answeredInDocs === "YES").length,
    partial: highImportance.filter((q) => q.answeredInDocs === "PARTIAL").length,
    missing: highImportance.filter((q) => q.answeredInDocs === "NO").length,
  };

  const mediumBreakdown = {
    answered: mediumImportance.filter((q) => q.answeredInDocs === "YES").length,
    partial: mediumImportance.filter((q) => q.answeredInDocs === "PARTIAL").length,
    missing: mediumImportance.filter((q) => q.answeredInDocs === "NO").length,
  };

  // Data for pie chart
  const pieData = [
    { name: "Answered", value: statusDistribution.answered, color: STATUS_COLORS.YES },
    { name: "Partial", value: statusDistribution.partial, color: STATUS_COLORS.PARTIAL },
    { name: "Missing", value: statusDistribution.missing, color: STATUS_COLORS.NO },
  ];

  // Data for stacked bar chart
  const barData = [
    {
      name: "High Priority",
      answered: highBreakdown.answered,
      partial: highBreakdown.partial,
      missing: highBreakdown.missing,
      total: highImportance.length,
    },
    {
      name: "Medium Priority",
      answered: mediumBreakdown.answered,
      partial: mediumBreakdown.partial,
      missing: mediumBreakdown.missing,
      total: mediumImportance.length,
    },
  ];

  const total = questions.length;
  const coveragePercentage = total > 0 
    ? Math.round(((statusDistribution.answered + statusDistribution.partial * 0.5) / total) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Question Analytics</CardTitle>
        <CardDescription>
          Breakdown of question coverage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-md border border-border bg-muted p-3 text-center">
            <p className="text-2xl font-semibold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center rounded-md bg-success/15 p-1.5 dark:bg-success/20">
              <CircleCheck className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-semibold text-success">
              {statusDistribution.answered}
            </p>
            <p className="text-xs text-muted-foreground">Answered</p>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center rounded-md bg-warning/15 p-1.5 dark:bg-warning/20">
              <CircleAlert className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-semibold text-warning">
              {statusDistribution.partial}
            </p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center rounded-md bg-destructive/15 p-1.5 dark:bg-destructive/20">
              <CircleX className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-semibold text-destructive">
              {statusDistribution.missing}
            </p>
            <p className="text-xs text-muted-foreground">Missing</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie Chart */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Overall Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Status by Importance</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs text-muted-foreground"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs text-muted-foreground"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="answered" stackId="a" fill={STATUS_COLORS.YES} name="Answered" />
                <Bar dataKey="partial" stackId="a" fill={STATUS_COLORS.PARTIAL} name="Partial" />
                <Bar dataKey="missing" stackId="a" fill={STATUS_COLORS.NO} name="Missing" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coverage Summary */}
        <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Overall Coverage</p>
              <p className="text-xs text-muted-foreground">
                Based on fully and partially answered questions
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">
                <span className="text-primary font-bold">
                  {coveragePercentage}%
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all duration-700"
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
