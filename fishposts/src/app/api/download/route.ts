import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Accept direct image URLs (i.imgflip.com) or page URLs (imgflip.com/i/)
  const isDirectImage = imageUrl.startsWith("https://i.imgflip.com/");
  const isPageUrl = imageUrl.startsWith("https://imgflip.com/i/");

  if (!isDirectImage && !isPageUrl) {
    return new Response(JSON.stringify({ error: "Invalid image URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let directUrl = imageUrl;

    // If it's a page URL, convert to direct image URL
    if (isPageUrl) {
      const slug = imageUrl.split("/i/")[1];
      directUrl = `https://i.imgflip.com/${slug}.jpg`;
    }

    const imgRes = await fetch(directUrl, { redirect: "manual" });
    if (imgRes.status >= 300 && imgRes.status < 400) {
      return new Response(JSON.stringify({ error: "Redirects not allowed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = imgRes.headers.get("Content-Type") || "image/jpeg";
    const imageData = await imgRes.arrayBuffer();

    // Extract slug for filename
    const slug = directUrl.match(/imgflip\.com\/([a-zA-Z0-9]+)/)?.[1] || "meme";
    const ext = contentType.includes("png") ? "png" : "jpg";

    return new Response(imageData, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="fishposts-${slug}.${ext}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Download failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
