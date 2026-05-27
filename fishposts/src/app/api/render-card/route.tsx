import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

/* ================================================================
   Win98-styled card renderer using satori (via next/og)
   Renders text content as a PNG image for download/sharing.
   ================================================================ */

// Mode-specific styling
const MODE_STYLES: Record<
  string,
  { bg: string; accent: string; titleColor: string; textColor: string }
> = {
  quote_dunks: {
    bg: "#0c1222",
    accent: "#7dd3fc",
    titleColor: "#7dd3fc",
    textColor: "#f0f9ff",
  },
  fish_dispatches: {
    bg: "#030a03",
    accent: "#86efac",
    titleColor: "#86efac",
    textColor: "#dcfce7",
  },
  unhinged_threads: {
    bg: "#0f0515",
    accent: "#e879f9",
    titleColor: "#e879f9",
    textColor: "#faf5ff",
  },
  corporate_bs: {
    bg: "#120d02",
    accent: "#fbbf24",
    titleColor: "#fbbf24",
    textColor: "#fefce8",
  },
  excuse_gen: {
    bg: "#1a0000",
    accent: "#FF4444",
    titleColor: "#FF4444",
    textColor: "#FF8888",
  },
};

const DEFAULT_STYLE = {
  bg: "#111111",
  accent: "#86efac",
  titleColor: "#86efac",
  textColor: "#f0f0f0",
};

export async function POST(request: NextRequest) {
  let mode: string;
  let content: string[];
  let title: string | undefined;

  try {
    const body = await request.json();
    mode = body.mode || "fish_dispatches";
    content = body.content;
    title = body.title;

    if (!Array.isArray(content) || content.length === 0) {
      return new Response(
        JSON.stringify({ error: "content array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const style = MODE_STYLES[mode] || DEFAULT_STYLE;

  // Width / Height from query params (default 1200x675 for social sharing)
  // Clamped to prevent OOM from absurdly large values
  const url = new URL(request.url);
  const width = Math.max(200, Math.min(2400, parseInt(url.searchParams.get("w") || "1200", 10) || 1200));
  const height = Math.max(200, Math.min(2400, parseInt(url.searchParams.get("h") || "675", 10) || 675));

  /* ================================================================
     excuse_gen — Win98 Error Dialog card
     ================================================================ */
  if (mode === "excuse_gen") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            background: "#008080",
            padding: "40px",
          }}
        >
          {/* Dialog box */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#C0C0C0",
              border: "2px solid",
              borderColor: "#fff #404040 #404040 #fff",
              padding: "2px",
              maxWidth: "900px",
              width: "100%",
            }}
          >
            {/* Titlebar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(90deg, #000080, #1084D0)",
                padding: "4px 8px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                <span>{"\u26A0\uFE0F"}</span>
                <span>excuse_gen.exe</span>
              </div>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "#C0C0C0",
                  border: "2px solid",
                  borderColor: "#fff #404040 #404040 #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                {"\u00D7"}
              </div>
            </div>

            {/* Body — icon + text */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "8px 20px 20px",
                gap: "20px",
              }}
            >
              {/* Warning icon */}
              <div
                style={{
                  fontSize: "52px",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {"\u26A0\uFE0F"}
              </div>

              {/* Text content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  flex: 1,
                }}
              >
                {title && (
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#000",
                      textTransform: "uppercase",
                    }}
                  >
                    {title}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "24px",
                    color: "#000",
                    lineHeight: 1.4,
                    fontWeight: "bold",
                  }}
                >
                  {content[0] || "Error: no excuse generated."}
                </div>
              </div>
            </div>

            {/* OK button + footer */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 20px 16px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  padding: "4px 32px",
                  background: "#C0C0C0",
                  border: "2px solid",
                  borderColor: "#fff #404040 #404040 #fff",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#000",
                }}
              >
                OK
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#808080",
                  display: "flex",
                  gap: "4px",
                }}
              >
                <span>fishposts.exe</span>
                <span>|</span>
                <span>powered by tinyfish.ai {"\uD83D\uDC1F"}</span>
              </div>
            </div>
          </div>
        </div>
      ),
      { width, height },
    );
  }

  /* ================================================================
     Default — generic terminal-style text card
     ================================================================ */
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          background: "#C0C0C0",
          padding: "8px",
        }}
      >
        {/* Win98 outer bevel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            border: "2px solid #fff",
            borderRight: "2px solid #404040",
            borderBottom: "2px solid #404040",
          }}
        >
          {/* Titlebar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(90deg, #000080, #1084D0)",
              padding: "4px 8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              <span>{"\uD83D\uDC1F"}</span>
              <span>fishposts.exe</span>
            </div>
            <div style={{ display: "flex", gap: "2px" }}>
              {["_", "\u25A1", "\u00D7"].map((btn) => (
                <div
                  key={btn}
                  style={{
                    width: "18px",
                    height: "18px",
                    background: "#C0C0C0",
                    border: "2px solid",
                    borderColor: "#fff #404040 #404040 #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {btn}
                </div>
              ))}
            </div>
          </div>

          {/* Body — dark terminal area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              margin: "8px",
              border: "2px solid",
              borderColor: "#808080 #fff #fff #808080",
              background: style.bg,
              padding: "24px 28px",
              gap: "8px",
            }}
          >
            {/* Title */}
            {title && (
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: style.titleColor,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "16px",
                  textShadow: `0 0 10px ${style.accent}`,
                  fontFamily: "monospace",
                }}
              >
                {title}
              </div>
            )}

            {/* Content lines */}
            {content.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: "20px",
                  color: style.textColor,
                  lineHeight: 1.6,
                  fontFamily: "monospace",
                  borderLeft:
                    mode === "unhinged_threads"
                      ? "none"
                      : `3px solid ${style.accent}`,
                  paddingLeft: mode === "unhinged_threads" ? "0" : "12px",
                  marginBottom: "4px",
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "3px 8px",
              margin: "0 8px 8px",
              border: "2px solid",
              borderColor: "#808080 #fff #fff #808080",
              fontSize: "12px",
              color: "#000",
              background: "#C0C0C0",
              gap: "8px",
            }}
          >
            <span>{"fishposts.exe"}</span>
            <span style={{ color: "#808080" }}>|</span>
            <span>{"powered by tinyfish.ai \uD83D\uDC1F"}</span>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
