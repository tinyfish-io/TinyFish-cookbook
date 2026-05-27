import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];

async function callGeminiWithRetry(
  prompt: string,
  apiKey: string,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          return await response.json();
        }

        const errorBody = await response.text();

        if (response.status === 429) {
          const retryMatch = errorBody.match(/retry in (\d+)/i);
          const retryDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : 5000;

          if (retryDelay <= 15000 && attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
          break;
        }

        lastError = new Error(`API error ${response.status}: ${errorBody}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

export async function POST(request: NextRequest) {
  try {
    const { topic, useCase } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `You are a dataset discovery assistant. Given a topic, suggest 6-8 well-known datasets with publicly accessible metadata.

Topic: ${topic}
Primary Use Case: ${useCase || 'general'}

SELECTION RULES:
- Prefer datasets with official documentation pages, GitHub repos, or HuggingFace cards
- Prefer datasets hosted on institutional/academic sites or open data portals
- Kaggle datasets are acceptable ONLY if they have external documentation
- Avoid datasets that require login to view basic metadata

For each dataset, return:
- name: Official dataset name
- source_url: Direct link to documentation page (NOT a download link)
- description: One sentence describing what the data contains
- platform: Where hosted (GitHub, HuggingFace, UCI, Official Website, etc.)

Return ONLY a valid JSON array:
[
  {
    "name": "Dataset Name",
    "source_url": "https://...",
    "description": "One sentence about the data",
    "platform": "Platform name"
  }
]`;

    const data = await callGeminiWithRetry(prompt, apiKey);
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return NextResponse.json({ error: 'No response from Gemini' }, { status: 500 });
    }

    let datasets;
    try {
      try {
        datasets = JSON.parse(textContent);
      } catch {
        let jsonStr = textContent.trim();
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        if (!jsonStr.startsWith('[')) {
          const arrayStart = jsonStr.indexOf('[');
          if (arrayStart >= 0) {
            jsonStr = jsonStr.substring(arrayStart);
          }
        }
        
        if (!jsonStr.endsWith(']')) {
          const objects: string[] = [];
          let depth = 0;
          let objectStart = -1;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\' && inString) {
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }
            
            if (inString) continue;
            
            if (char === '{') {
              if (depth === 1) objectStart = i;
              depth++;
            } else if (char === '}') {
              depth--;
              if (depth === 1 && objectStart >= 0) {
                const obj = jsonStr.substring(objectStart, i + 1);
                try {
                  const parsed = JSON.parse(obj);
                  if (parsed.name && parsed.source_url) {
                    objects.push(obj);
                  }
                } catch {
                  // Skip invalid objects
                }
                objectStart = -1;
              }
            }
          }
          
          if (objects.length > 0) {
            jsonStr = '[' + objects.join(',') + ']';
          } else {
            throw new Error('Could not recover any complete dataset objects');
          }
        }
        
        datasets = JSON.parse(jsonStr);
      }

      if (!Array.isArray(datasets) || datasets.length === 0) {
        throw new Error('Invalid datasets data');
      }

      datasets = datasets.filter(
        (d: { name?: string; source_url?: string; description?: string }) =>
          d && d.name && d.source_url && d.source_url.startsWith('http')
      );

      if (datasets.length === 0) {
        throw new Error('No valid datasets found');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', textContent);
      console.error('Parse error:', parseError);
      return NextResponse.json({ error: 'Failed to parse dataset suggestions' }, { status: 500 });
    }

    return NextResponse.json({ datasets });
  } catch (error) {
    console.error('Error in discover-datasets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      return NextResponse.json(
        { error: 'Gemini API rate limit exceeded. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
