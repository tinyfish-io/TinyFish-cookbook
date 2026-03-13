"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

type QuestionProgress = {
  id: string;
  question: string;
  status: "pending" | "analyzing" | "complete";
  answer: "YES" | "NO" | "PARTIAL" | null;
  importance: "HIGH" | "MEDIUM";
};

interface LiveProgressProps {
  questions: string[];
  onComplete?: () => void;
}

export function LiveProgress({ questions, onComplete }: LiveProgressProps) {
  const [progress, setProgress] = useState<QuestionProgress[]>([]);
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    // Initialize questions as pending
    const initialProgress = questions.map((q, i) => ({
      id: `q-${i}`,
      question: q,
      status: "pending" as const,
      answer: null,
      importance: (i % 3 === 0 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
    }));
    setProgress(initialProgress);

    // Simulate streaming results (in real implementation, this would be SSE or polling)
    const simulateStream = async () => {
      for (let i = 0; i < questions.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Mark as analyzing
        setProgress((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: "analyzing" } : q
          )
        );

        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mark as complete with answer
        const answers: Array<"YES" | "NO" | "PARTIAL"> = ["YES", "NO", "PARTIAL"];
        const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
        
        setProgress((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: "complete", answer: randomAnswer } : q
          )
        );

        // Update score
        setCurrentScore(Math.min(100, Math.round(((i + 1) / questions.length) * 80 + Math.random() * 20)));
      }
      
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
    };

    simulateStream();
  }, [questions, onComplete]);

  const completedCount = progress.filter((p) => p.status === "complete").length;
  const percentage = Math.round((completedCount / questions.length) * 100);

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{currentScore}</span>
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: "2s" }}></div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Score</p>
                <p className="text-2xl font-bold">{percentage}% Complete</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Questions Analyzed</p>
              <p className="text-xl font-semibold">{completedCount} / {questions.length}</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Question Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {progress.map((q) => (
          <Card
            key={q.id}
            className={`transition-all duration-500 ${
              q.status === "complete"
                ? "opacity-100 scale-100"
                : q.status === "analyzing"
                ? "opacity-100 scale-100 border-primary/50 bg-primary/5"
                : "opacity-40 scale-95"
            }`}
            style={{
              animation: q.status === "analyzing" ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : undefined,
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {q.status === "pending" && (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  {q.status === "analyzing" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {q.status === "complete" && q.answer === "YES" && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  {q.status === "complete" && q.answer === "PARTIAL" && (
                    <AlertCircle className="h-5 w-5 text-warning" />
                  )}
                  {q.status === "complete" && q.answer === "NO" && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{q.question}</p>
                  {q.status === "analyzing" && (
                    <p className="mt-1 text-xs text-muted-foreground">Analyzing...</p>
                  )}
                  {q.status === "complete" && (
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          q.answer === "YES"
                            ? "text-success"
                            : q.answer === "PARTIAL"
                            ? "text-warning"
                            : "text-destructive"
                        }`}
                      >
                        {q.answer}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{q.importance}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
