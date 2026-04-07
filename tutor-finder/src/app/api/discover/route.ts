import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const FALLBACK_WEBSITES = [
  { name: "Wyzant", url: "https://www.wyzant.com/search" },
  { name: "Varsity Tutors", url: "https://www.varsitytutors.com/tutors" },
  { name: "Preply", url: "https://preply.com/en/online" },
  { name: "Kaplan", url: "https://www.kaptest.com/tutoring" },
  { name: "Princeton Review", url: "https://www.princetonreview.com/tutoring" },
  { name: "Tutor.com", url: "https://www.tutor.com" },
  { name: "Chegg Tutors", url: "https://www.chegg.com/tutors" },
];

export async function POST(req: NextRequest) {
  try {
    const { exam, location } = await req.json();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are helping find tutoring websites for standardized exam preparation.

The user wants to find tutors for: ${exam}
Location: ${location}

Return a JSON array of 7-10 popular tutoring websites that are likely to have ${exam} tutors.
Focus on reputable platforms that:
1. Have tutor profiles with qualifications and reviews
2. Are accessible in or near ${location}
3. Are well-known for ${exam} preparation

Include a mix of:
- Global online tutoring platforms (Wyzant, Varsity Tutors, Preply, etc.)
- Test prep specific sites (Kaplan, Princeton Review, Magoosh, etc.)
- Local tutoring services if applicable

Return ONLY a valid JSON array with this exact format:
[
  {"name": "Website Name", "url": "https://full-url-to-tutor-search-page"},
  ...
]

Make sure URLs point to the specific tutor search or directory pages when possible.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || "";

    let websites: { name: string; url: string }[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        websites = JSON.parse(jsonMatch[0]);
      }
    } catch {
      websites = FALLBACK_WEBSITES;
    }

    if (!websites.length) websites = FALLBACK_WEBSITES;

    return NextResponse.json({ websites });
  } catch (error) {
    console.error("Error in /api/discover:", error);
    return NextResponse.json({ websites: FALLBACK_WEBSITES });
  }
}
