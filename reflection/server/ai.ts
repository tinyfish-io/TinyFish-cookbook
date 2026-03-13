/**
 * AI Service for content summarization and categorization
 * Uses the built-in LLM helper from Manus
 */

import { invokeLLM } from "./_core/llm";

/**
 * Generate a concise 2-3 sentence summary of content
 */
export async function summarizeContent(content: string, title?: string): Promise<string> {
  try {
    const prompt = title
      ? `Summarize this article titled "${title}" in 2-3 concise sentences:\n\n${content.slice(0, 2000)}`
      : `Summarize this content in 2-3 concise sentences:\n\n${content.slice(0, 2000)}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise, informative summaries. Keep summaries to 2-3 sentences maximum.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const msgContent = response.choices[0]?.message?.content;
    return typeof msgContent === "string" ? msgContent : "";
  } catch (error) {
    console.error("AI summarization error:", error);
    // Fallback to simple truncation
    return content.slice(0, 200) + "...";
  }
}

/**
 * Categorize content into predefined categories
 */
export async function categorizeContent(title: string, summary: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a content categorization assistant. Categorize content into ONE of these categories: Tech, Business, Health, Science, Politics, Entertainment, Sports, Lifestyle, Other. Respond with ONLY the category name, nothing else.",
        },
        {
          role: "user",
          content: `Title: ${title}\nSummary: ${summary}`,
        },
      ],
    });

    const msgContent = response.choices[0]?.message?.content;
    const category = (typeof msgContent === "string" ? msgContent.trim() : "Other") || "Other";
    
    // Validate category
    const validCategories = [
      "Tech",
      "Business",
      "Health",
      "Science",
      "Politics",
      "Entertainment",
      "Sports",
      "Lifestyle",
      "Other",
    ];
    
    return validCategories.includes(category) ? category : "Other";
  } catch (error) {
    console.error("AI categorization error:", error);
    return "Other";
  }
}

/**
 * Calculate relevance score for content based on user preferences
 * Returns a score from 0-100
 */
export async function calculateRelevanceScore(
  title: string,
  summary: string,
  userInterests?: string[]
): Promise<number> {
  if (!userInterests || userInterests.length === 0) {
    return 50; // Default neutral score
  }

  try {
    const interestsList = userInterests.join(", ");
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a content relevance scoring assistant. Rate how relevant content is to a user's interests on a scale of 0-100. Respond with ONLY a number between 0 and 100, nothing else.",
        },
        {
          role: "user",
          content: `User interests: ${interestsList}\n\nContent Title: ${title}\nContent Summary: ${summary}\n\nRelevance score (0-100):`,
        },
      ],
    });

    const msgContent = response.choices[0]?.message?.content;
    const scoreText = (typeof msgContent === "string" ? msgContent.trim() : "50") || "50";
    const score = parseInt(scoreText, 10);
    
    // Validate score is between 0-100
    return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error("AI relevance scoring error:", error);
    return 50; // Default neutral score
  }
}

/**
 * Extract key topics from content
 */
export async function extractTopics(content: string): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a topic extraction assistant. Extract 3-5 key topics from the content. Return them as a comma-separated list.",
        },
        {
          role: "user",
          content: content.slice(0, 1000),
        },
      ],
    });

    const msgContent2 = response.choices[0]?.message?.content;
    const topicsText = typeof msgContent2 === "string" ? msgContent2 : "";
    return topicsText
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0)
      .slice(0, 5);
  } catch (error) {
    console.error("AI topic extraction error:", error);
    return [];
  }
}

/**
 * Process content with AI: summarize, categorize, and score
 */
export async function processContentWithAI(
  title: string,
  fullContent: string,
  userInterests?: string[]
): Promise<{
  summary: string;
  category: string;
  relevanceScore: number;
  topics: string[];
}> {
  // Run summarization and categorization in parallel
  const [summary, category, topics] = await Promise.all([
    summarizeContent(fullContent, title),
    categorizeContent(title, fullContent.slice(0, 500)),
    extractTopics(fullContent),
  ]);

  // Calculate relevance score using the generated summary
  const relevanceScore = await calculateRelevanceScore(title, summary, userInterests);

  return {
    summary,
    category,
    relevanceScore,
    topics,
  };
}
