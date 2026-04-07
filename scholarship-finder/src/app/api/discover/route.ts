import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { scholarshipType, university, region } = await req.json();

  const prompt = `You are a scholarship research expert. Find 6-8 real URLs of scholarship listing pages for:
- Scholarship type: ${scholarshipType}
${university ? `- University: ${university}` : ""}
${region ? `- Region: ${region}` : ""}

Return ONLY a JSON array of objects with this shape:
[{ "url": "https://...", "siteName": "Site Name" }]

Rules:
- Use real, currently active scholarship pages (not homepages)
- Mix of university official pages, government scholarship portals, and reputable non-profits
- Prefer pages that list multiple scholarships
- No markdown, no explanation, just the JSON array`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const text = completion.choices[0].message.content || "[]";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const urls = JSON.parse(clean);
    return NextResponse.json({ urls });
  } catch {
    return NextResponse.json({ urls: [] });
  }
}
