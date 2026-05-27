"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

type QuestionStatus = {
  id: string;
  question: string;
  currentStatus: "YES" | "NO" | "PARTIAL";
  importance: "HIGH" | "MEDIUM";
  impact: number;
};

interface ScoreSimulatorProps {
  currentScore: number;
  questions: QuestionStatus[];
}

export function ScoreSimulator({ currentScore, questions }: ScoreSimulatorProps) {
  // Track which questions are "fixed" (moved to YES)
  const [fixedQuestions, setFixedQuestions] = useState<Set<string>>(new Set());

  // Calculate simulated score based on fixed questions
  const simulatedScore = useMemo(() => {
    let additionalPoints = 0;
    fixedQuestions.forEach((qId) => {
      const question = questions.find((q) => q.id === qId);
      if (question) {
        additionalPoints += question.impact;
      }
    });
    return Math.min(100, currentScore + additionalPoints);
  }, [currentScore, fixedQuestions, questions]);

  const scoreDelta = simulatedScore - currentScore;

  // Get top impact questions (not yet fixed)
  const topImpactQuestions = useMemo(() => {
    return questions
      .filter((q) => q.currentStatus !== "YES" && !fixedQuestions.has(q.id))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
  }, [questions, fixedQuestions]);

  const toggleQuestion = (qId: string) => {
    setFixedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const resetSimulation = () => {
    setFixedQuestions(new Set());
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Score Impact Simulator</CardTitle>
            <CardDescription>See how fixing issues would improve your score</CardDescription>
          </div>
          {fixedQuestions.size > 0 && (
            <button
              onClick={resetSimulation}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Comparison */}
        <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 bg-muted/30">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Score</p>
            <p className="text-4xl font-bold text-foreground">{currentScore}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {scoreDelta > 0 ? (
              <TrendingUp className="h-8 w-8 text-success" />
            ) : (
              <TrendingDown className="h-8 w-8 text-muted-foreground/50" />
            )}
            {scoreDelta > 0 && (
              <span className="text-2xl font-bold text-success">+{scoreDelta}</span>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Potential Score</p>
            <p
              className={`text-4xl font-bold transition-colors duration-500 ${
                scoreDelta > 0 ? "text-success" : "text-foreground"
              }`}
            >
              {simulatedScore}
            </p>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="relative">
          <div className="flex h-12 items-center gap-2">
            <div className="relative h-8 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground/20 transition-all duration-700"
                style={{ width: `${currentScore}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 h-full bg-success transition-all duration-700"
                style={{ width: `${simulatedScore}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground w-12">100</span>
          </div>
        </div>

        {/* Top Impact Questions */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">Top Impact Improvements</h4>
          <div className="space-y-2">
            {topImpactQuestions.map((q, index) => {
              const isFixed = fixedQuestions.has(q.id);
              const rowKey = q.id ?? `sim-q-${index}`;
              return (
                <button
                  key={rowKey}
                  onClick={() => toggleQuestion(q.id)}
                  className={`w-full text-left rounded-lg border-2 p-3 transition-all duration-300 ${
                    isFixed
                      ? "border-success/50 bg-success/10"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={q.importance === "HIGH" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {q.importance}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            q.currentStatus === "YES"
                              ? "border-success text-success"
                              : q.currentStatus === "PARTIAL"
                              ? "border-warning text-warning"
                              : "border-destructive text-destructive"
                          }`}
                        >
                          {q.currentStatus}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{q.question}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div
                        className={`text-lg font-bold transition-colors duration-300 ${
                          isFixed ? "text-success" : "text-muted-foreground"
                        }`}
                      >
                        +{q.impact}
                      </div>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {fixedQuestions.size > 0 && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <p className="text-sm font-medium">
              Fixing {fixedQuestions.size} issue{fixedQuestions.size > 1 ? "s" : ""} could improve
              your score by <span className="font-bold text-success">+{scoreDelta} points</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
