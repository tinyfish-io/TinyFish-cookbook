type AnswerStatus = "YES" | "NO" | "PARTIAL";
type Importance = "HIGH" | "MEDIUM";

export type ConsistencyPageQuestion = {
  question: string;
  answeredInDocs: AnswerStatus;
  partialAnswer: string | null;
  importance: Importance;
};

export type ConsistencyPage = {
  url: string;
  questions: ConsistencyPageQuestion[];
};

export type ConsistencyFinding = {
  question: string;
  delta: number;
  severity: "HIGH" | "MEDIUM";
  pages: Array<{
    url: string;
    answeredInDocs: AnswerStatus;
    partialAnswer: string | null;
  }>;
};

export type ConsistencyReport = {
  consistencyScore: number;
  totalQuestions: number;
  inconsistencies: ConsistencyFinding[];
};

const ANSWER_VALUE: Record<AnswerStatus, number> = {
  YES: 1,
  PARTIAL: 0.5,
  NO: 0,
};

const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  HIGH: 1,
  MEDIUM: 0.6,
};

function normalizeQuestion(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

export function computeConsistency(pages: ConsistencyPage[]): ConsistencyReport {
  const questionMap = new Map<
    string,
    { original: string; items: Array<{ page: string; q: ConsistencyPageQuestion }> }
  >();

  for (const page of pages) {
    for (const question of page.questions) {
      const key = normalizeQuestion(question.question);
      if (!questionMap.has(key)) {
        questionMap.set(key, { original: question.question, items: [] });
      }
      questionMap.get(key)!.items.push({ page: page.url, q: question });
    }
  }

  let weightedDeltaSum = 0;
  let weightSum = 0;
  const inconsistencies: ConsistencyFinding[] = [];

  for (const entry of questionMap.values()) {
    const scores = entry.items.map((item) => ({
      value: ANSWER_VALUE[item.q.answeredInDocs],
      weight: IMPORTANCE_WEIGHT[item.q.importance],
    }));
    if (scores.length < 2) continue;

    const values = scores.map((s) => s.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const delta = Math.abs(max - min);
    const weight = Math.max(...scores.map((s) => s.weight));

    weightedDeltaSum += delta * weight;
    weightSum += weight;

    if (delta >= 0.4) {
      inconsistencies.push({
        question: entry.original,
        delta: Number(delta.toFixed(2)),
        severity: weight === 1 ? "HIGH" : "MEDIUM",
        pages: entry.items.map((item) => ({
          url: item.page,
          answeredInDocs: item.q.answeredInDocs,
          partialAnswer: item.q.partialAnswer,
        })),
      });
    }
  }

  const consistencyScore = weightSum
    ? Math.round((1 - weightedDeltaSum / weightSum) * 100)
    : 100;

  return {
    consistencyScore,
    totalQuestions: questionMap.size,
    inconsistencies,
  };
}
