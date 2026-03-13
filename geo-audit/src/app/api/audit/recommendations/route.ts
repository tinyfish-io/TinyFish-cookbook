import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export const runtime = "nodejs";

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

type LlmoFindingInput = {
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  actionItems: string[];
};

// Analyze questions and generate recommendations
function generateRecommendations(
  questions: Array<{
    question: string;
    answeredInDocs: string;
    partialAnswer: string | null;
    importance: string;
  }>,
  llmoFindings?: LlmoFindingInput[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idCounter = 1;

  // Group questions by status
  const missing = questions.filter((q) => q.answeredInDocs === "NO");
  const partial = questions.filter((q) => q.answeredInDocs === "PARTIAL");
  const highPriorityMissing = missing.filter((q) => q.importance === "HIGH");
  const highPriorityPartial = partial.filter((q) => q.importance === "HIGH");

  // Pattern matching for common question types
  const pricingQuestions = questions.filter((q) =>
    /pricing|price|cost|fee|plan|subscription/i.test(q.question)
  );
  const featureQuestions = questions.filter((q) =>
    /feature|capability|function|offer|provide|include/i.test(q.question)
  );
  const benefitQuestions = questions.filter((q) =>
    /benefit|advantage|why|help|solve|improve/i.test(q.question)
  );
  const comparisonQuestions = questions.filter((q) =>
    /compare|versus|vs|alternative|competitor|different/i.test(q.question)
  );
  const technicalQuestions = questions.filter((q) =>
    /integrate|api|technical|sdk|developer|setup|install/i.test(q.question)
  );

  // Generate specific recommendations based on patterns

  // 1. Pricing information
  const missingPricing = pricingQuestions.filter((q) => q.answeredInDocs !== "YES");
  if (missingPricing.length > 0) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Add Clear Pricing Information",
      description: `${missingPricing.length} pricing-related questions are unanswered. AI engines cannot find pricing details.`,
      impact: "HIGH",
      estimatedPoints: 15,
      priority: 1,
      category: "Content",
      actionItems: [
        "Create a dedicated pricing page or section",
        "List all plans with clear pricing tiers",
        "Include currency and billing frequency",
        "Add comparison table if multiple plans exist",
      ],
    });
  }

  // 2. Feature clarity
  const missingFeatures = featureQuestions.filter((q) => q.answeredInDocs !== "YES");
  if (missingFeatures.length >= 2) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Clarify Product Features",
      description: `${missingFeatures.length} feature questions need better answers. Improve feature descriptions for AI comprehension.`,
      impact: "HIGH",
      estimatedPoints: 12,
      priority: 2,
      category: "Content",
      actionItems: [
        "Create a features section with bullet points",
        "Use clear, descriptive language",
        "Include examples or use cases",
        "Add feature comparison if applicable",
      ],
    });
  }

  // 3. Benefits and value proposition
  const missingBenefits = benefitQuestions.filter((q) => q.answeredInDocs !== "YES");
  if (missingBenefits.length > 0) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Strengthen Value Proposition",
      description: `AI engines struggle to understand your core benefits. ${missingBenefits.length} benefit questions unanswered.`,
      impact: "HIGH",
      estimatedPoints: 10,
      priority: 3,
      category: "Content",
      actionItems: [
        "Add a clear \"Why choose us?\" section",
        "List specific benefits with examples",
        "Include customer testimonials or results",
        "Use problem-solution framing",
      ],
    });
  }

  // 4. Competitive positioning
  const missingComparison = comparisonQuestions.filter((q) => q.answeredInDocs !== "YES");
  if (missingComparison.length > 0) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Add Competitive Differentiation",
      description: `${missingComparison.length} comparison questions show AI can't identify your unique advantages.`,
      impact: "MEDIUM",
      estimatedPoints: 8,
      priority: 4,
      category: "Content",
      actionItems: [
        "Create a comparison page or section",
        "Highlight unique features or benefits",
        "Address common objections",
        "Include migration guides if applicable",
      ],
    });
  }

  // 5. Technical documentation
  const missingTechnical = technicalQuestions.filter((q) => q.answeredInDocs !== "YES");
  if (missingTechnical.length > 0) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Improve Technical Documentation",
      description: `${missingTechnical.length} technical questions unanswered. Add integration guides and API docs.`,
      impact: "MEDIUM",
      estimatedPoints: 7,
      priority: 5,
      category: "Documentation",
      actionItems: [
        "Create getting started guide",
        "Document API endpoints and SDKs",
        "Add code examples",
        "Include troubleshooting section",
      ],
    });
  }

  // 6. General high-priority items
  if (highPriorityMissing.length > 0 && recommendations.length < 3) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Address High-Priority Gaps",
      description: `${highPriorityMissing.length} high-importance questions are completely unanswered.`,
      impact: "HIGH",
      estimatedPoints: 10,
      priority: 2,
      category: "Content",
      actionItems: [
        "Review each missing high-priority question",
        "Add dedicated sections for each topic",
        "Use clear headings that match question intent",
        "Provide comprehensive answers with examples",
      ],
    });
  }

  // 7. Partial answers improvement
  if (highPriorityPartial.length >= 2) {
    recommendations.push({
      id: `rec-${idCounter++}`,
      title: "Complete Partial Answers",
      description: `${highPriorityPartial.length} high-priority questions have incomplete answers. Small improvements for big gains.`,
      impact: "MEDIUM",
      estimatedPoints: 6,
      priority: 3,
      category: "Content",
      actionItems: [
        "Review partially answered questions",
        "Add missing details or examples",
        "Restructure content for clarity",
        "Use bullet points and subheadings",
      ],
    });
  }

  // 8. LLMO rubric findings (when available from current-run payload)
  if (Array.isArray(llmoFindings) && llmoFindings.length > 0) {
    const toPriority = (severity: LlmoFindingInput["severity"]): number => {
      if (severity === "HIGH") return 1;
      if (severity === "MEDIUM") return 3;
      return 5;
    };
    const toImpact = (severity: LlmoFindingInput["severity"]): Recommendation["impact"] => {
      if (severity === "HIGH") return "HIGH";
      if (severity === "MEDIUM") return "MEDIUM";
      return "LOW";
    };
    const toPoints = (severity: LlmoFindingInput["severity"]): number => {
      if (severity === "HIGH") return 12;
      if (severity === "MEDIUM") return 8;
      return 4;
    };

    const ranked = [...llmoFindings].sort((a, b) => toPriority(a.severity) - toPriority(b.severity));
    for (const f of ranked.slice(0, 3)) {
      recommendations.push({
        id: `rec-${idCounter++}`,
        title: f.title,
        description: f.description,
        impact: toImpact(f.severity),
        estimatedPoints: toPoints(f.severity),
        priority: toPriority(f.severity),
        category: f.category || "LLMO",
        actionItems:
          Array.isArray(f.actionItems) && f.actionItems.length
            ? f.actionItems.slice(0, 4)
            : ["Address the identified LLMO signal gap."],
      });
    }
  }

  // Sort by priority and return top recommendations
  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");
  const sessionId = searchParams.get("sessionId");

  if (!runId && !sessionId) {
    return NextResponse.json(
      { error: "Missing runId or sessionId parameter" },
      { status: 400 }
    );
  }

  try {
    let questions: Array<{
      question: string;
      answeredInDocs: string;
      partialAnswer: string | null;
      importance: string;
    }> = [];

    if (runId) {
      // Fetch questions for single audit
      const audit = await prisma.auditRun.findUnique({
        where: { id: runId },
        include: {
          questions: {
            select: {
              question: true,
              answeredInDocs: true,
              partialAnswer: true,
              importance: true,
            },
          },
        },
      });

      if (!audit) {
        return NextResponse.json({ error: "Audit not found" }, { status: 404 });
      }

      questions = audit.questions;
    } else if (sessionId) {
      // Fetch questions for multi-page audit
      const session = await prisma.auditSession.findUnique({
        where: { id: sessionId },
        include: {
          pages: {
            include: {
              questions: {
                select: {
                  question: true,
                  answeredInDocs: true,
                  partialAnswer: true,
                  importance: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Flatten all questions from all pages
      questions = session.pages.flatMap((page) => page.questions);
    }

    const recommendations = generateRecommendations(questions);

    return NextResponse.json({
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        potentialPoints: recommendations.reduce((sum, rec) => sum + rec.estimatedPoints, 0),
        highImpactCount: recommendations.filter((rec) => rec.impact === "HIGH").length,
      },
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Recommendations temporarily unavailable" },
      { status: 500 }
    );
  }
}

type QuestionInput = {
  question: string;
  answeredInDocs: string;
  partialAnswer: string | null;
  importance: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const questions = body?.questions;
    const llmoFindingsRaw = body?.llmoFindings;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty questions array" },
        { status: 400 }
      );
    }

    const normalized: QuestionInput[] = questions.map((q: unknown) => ({
      question: typeof (q as QuestionInput).question === "string" ? (q as QuestionInput).question : "",
      answeredInDocs: typeof (q as QuestionInput).answeredInDocs === "string" ? (q as QuestionInput).answeredInDocs : "NO",
      partialAnswer: (q as QuestionInput).partialAnswer != null ? String((q as QuestionInput).partialAnswer) : null,
      importance: typeof (q as QuestionInput).importance === "string" ? (q as QuestionInput).importance : "MEDIUM",
    }));

    const llmoFindings: LlmoFindingInput[] = Array.isArray(llmoFindingsRaw)
      ? llmoFindingsRaw.map((f: unknown) => {
          const item = f as Partial<LlmoFindingInput>;
          return {
            category: typeof item.category === "string" ? item.category : "LLMO",
            severity:
              item.severity === "HIGH" || item.severity === "MEDIUM" || item.severity === "LOW"
                ? item.severity
                : "MEDIUM",
            title: typeof item.title === "string" ? item.title : "Improve LLMO readiness",
            description:
              typeof item.description === "string"
                ? item.description
                : "Address a detected LLMO gap.",
            actionItems: Array.isArray(item.actionItems)
              ? item.actionItems.filter((x) => typeof x === "string")
              : [],
          };
        })
      : [];

    const recommendations = generateRecommendations(normalized, llmoFindings);

    return NextResponse.json({
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        potentialPoints: recommendations.reduce((sum, rec) => sum + rec.estimatedPoints, 0),
        highImpactCount: recommendations.filter((rec) => rec.impact === "HIGH").length,
      },
    });
  } catch (error) {
    console.error("Error generating recommendations (POST):", error);
    return NextResponse.json(
      { error: "Recommendations temporarily unavailable" },
      { status: 500 }
    );
  }
}
