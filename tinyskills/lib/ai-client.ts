import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";
import type { SourceType, IdentifiedSource } from "@/types";

// Create OpenRouter provider
function createOpenRouterProvider() {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://skillforge.vercel.app",
      "X-Title": "SkillForge",
    },
  });
}

// Get model via OpenRouter
export function getModel(modelId: string = "google/gemini-2.5-flash-lite") {
  const openrouter = createOpenRouterProvider();
  return openrouter.chatModel(modelId);
}

// Schema for identified sources
const identifiedSourceSchema = z.object({
  url: z.string().url(),
  type: z.enum(["docs", "github", "stackoverflow", "blog"]),
  title: z.string(),
  reason: z.string(),
});

const identifiedSourcesSchema = z.object({
  sources: z.array(identifiedSourceSchema),
});

export type IdentifySourcesResponse = z.infer<typeof identifiedSourcesSchema>;

/**
 * Use AI to identify real URLs for scraping based on topic
 */
export async function identifySources(
  topic: string,
  enabledTypes: SourceType[],
  maxPerType: number = 2,
  options?: { modelId?: string }
): Promise<IdentifiedSource[]> {
  const model = getModel(options?.modelId);

  const typeDescriptions = {
    docs: "official documentation pages (e.g., docs.example.com, developer.example.com)",
    github:
      "GitHub repository pages, issues, or discussions (e.g., github.com/org/repo/issues)",
    stackoverflow:
      "Stack Overflow question pages with good answers (e.g., stackoverflow.com/questions/...)",
    blog: "developer blog posts and tutorials (e.g., dev.to, medium.com, personal blogs)",
  };

  const enabledTypesList = enabledTypes
    .map((t) => `- ${t}: ${typeDescriptions[t]}`)
    .join("\n");

  const system = `You are an expert at finding high-quality learning resources for technical topics.
You will respond with JSON containing an array of sources.

Your job is to identify REAL, SPECIFIC URLs that would be valuable for learning about a given topic.

IMPORTANT RULES:
1. Only return URLs that you are confident actually exist
2. Prefer well-known, authoritative sources
3. URLs must be complete and valid (include https://)
4. For GitHub, prefer repos with good documentation or relevant issues
5. For Stack Overflow, prefer questions with accepted answers and high vote counts
6. For blogs, prefer detailed tutorials from reputable developers

Return ${maxPerType} URLs per source type where possible.
Respond with valid JSON only.`;

  const prompt = `Find learning resources for: "${topic}"

Enabled source types:
${enabledTypesList}

For each URL, provide in JSON format:
- url: The complete URL
- type: The source type (docs, github, stackoverflow, blog)
- title: A descriptive title for the resource
- reason: Why this resource is valuable for learning about ${topic}

Return ${maxPerType} resources per enabled type as a JSON object with a "sources" array.
If you're unsure about a URL's existence, skip it rather than guess.
Respond with JSON only.`;

  try {
    let sources: Array<{ url: string; type: string; title: string; reason: string }>;

    try {
      // Try generateObject first
      const { object } = await generateObject({
        model,
        schema: identifiedSourcesSchema,
        system,
        prompt,
      });
      sources = object.sources;
    } catch (objectError) {
      // Fallback to generateText with JSON parsing
      console.log("generateObject failed, falling back to generateText:", objectError);

      const { text } = await generateText({
        model,
        system,
        prompt,
      });

      // Parse JSON from response
      let jsonText = text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      // Find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      sources = parsed.sources || [];
    }

    // Filter to only enabled types and limit per type
    const filteredSources = sources.filter((s) =>
      enabledTypes.includes(s.type as SourceType)
    );

    // Group by type and limit
    const byType: Record<string, IdentifiedSource[]> = {};
    for (const source of filteredSources) {
      if (!byType[source.type]) {
        byType[source.type] = [];
      }
      if (byType[source.type].length < maxPerType) {
        byType[source.type].push(source as IdentifiedSource);
      }
    }

    // Flatten back to array
    return Object.values(byType).flat();
  } catch (error) {
    console.error("Failed to identify sources:", error);
    throw new Error(
      `Failed to identify sources: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert topic to a valid skill name (lowercase, hyphens, max 64 chars)
 */
function topicToSkillName(topic: string): string {
  // Convert to gerund form if it's a noun (add "using-" prefix for tools/frameworks)
  const cleaned = topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 64);

  // If it doesn't start with a verb, prefix with "using-"
  const verbPrefixes = ["building", "creating", "managing", "processing", "analyzing", "testing", "writing", "deploying", "configuring", "implementing"];
  const startsWithVerb = verbPrefixes.some(v => cleaned.startsWith(v));

  if (!startsWithVerb && cleaned.length < 58) {
    return `using-${cleaned}`;
  }
  return cleaned;
}

/**
 * Generate SKILL.md from scraped content using streaming
 * Follows Anthropic's official SKILL.md authoring guidelines
 */
export function synthesizeSkill(
  topic: string,
  scrapedContent: Array<{ source: IdentifiedSource; content: string }>,
  options?: { modelId?: string }
) {
  const model = getModel(options?.modelId);
  const skillName = topicToSkillName(topic);

  // Build context from all scraped content
  const contentSections = scrapedContent
    .map(
      ({ source, content }) =>
        `## Source: ${source.title} (${source.type})
URL: ${source.url}

${content}`
    )
    .join("\n\n---\n\n");

  const system = `You are an expert at writing comprehensive SKILL.md files following Anthropic's official authoring guidelines.

OUTPUT RAW MARKDOWN ONLY. Do NOT wrap output in \`\`\`markdown code blocks.

RULES:

1. YAML FRONTMATTER (required at the very start):
---
name: ${skillName}
description: [Third-person, max 1024 chars. WHAT it does + WHEN to use it. Example: "Configures X authentication and handles Y workflows. Use when working with X API or managing Y data."]
---

2. BE COMPREHENSIVE BUT FOCUSED:
- Include all important patterns and techniques from the scraped content
- Skip basic concepts Claude already knows (HTTP, JSON, etc.)
- Include enough detail that someone can actually USE this skill
- Aim for 300-500 lines - thorough coverage, not a stub

3. STRUCTURE:
# [Topic Name]

## Quick Start
[Complete working example with all necessary setup - not just a snippet]

## Core Concepts
[Key terminology and mental models specific to this topic - what makes it different]

## Essential Patterns
[ALL important patterns from the docs - typically 4-8 patterns with full code examples]
[Each pattern should have: description, complete code example, expected output/behavior]

## Authentication & Setup
[If applicable: full auth flow, environment setup, configuration]

## Common Pitfalls
[Real errors from GitHub/SO - be thorough, include 5-10 common issues]
- **Error message or symptom**: Root cause → Complete solution with code

## Best Practices
[Do's and don'ts gathered from experienced developers]

## API Reference
[Key endpoints, methods, parameters in cheatsheet format]

## Workflows
[Multi-step processes with numbered steps and code for each]

4. CODE EXAMPLES:
- Show COMPLETE, copy-pasteable code (not fragments)
- Include imports, setup, and error handling where relevant
- Use placeholders like <API_KEY> consistently
- Show both the code AND expected output where helpful

5. AVOID:
- Wrapping output in markdown code blocks
- Shallow coverage - dig into the details
- Skipping patterns just to be brief
- Section headers without substantial content`;

  const prompt = `Create a comprehensive SKILL.md file for: "${topic}"

SCRAPED CONTENT FROM MULTIPLE SOURCES:

${contentSections}

REQUIREMENTS:
1. Output raw markdown starting with --- (YAML frontmatter). NO \`\`\`markdown wrapper.
2. name: "${skillName}"
3. description: Third person, comprehensive ("Handles X authentication, manages Y workflows, and provides Z patterns. Use when...")
4. Quick Start: Complete working example with setup, not just a code snippet
5. Core Concepts: Key terminology and mental models unique to this topic
6. Essential Patterns: Extract ALL important patterns from the docs (typically 4-8) with full code examples
7. Common Pitfalls: Gather ALL real errors from GitHub issues and Stack Overflow (aim for 5-10)
8. Best Practices: Synthesize advice from experienced developers
9. API Reference: Key methods/endpoints in cheatsheet format
10. Workflows: Multi-step processes with complete code

Be thorough - extract maximum value from the scraped content. Aim for 300-500 lines.
Include complete, working code examples that someone can actually copy and use.

Start output with --- (the YAML frontmatter delimiter).`;

  return streamText({
    model,
    system,
    prompt,
  });
}
