import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { websiteUrl, websiteName, exam } = await req.json();
    
    if (!websiteUrl || !exam) {
      return new Response(
        JSON.stringify({ error: 'Website URL and exam are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MINO_API_KEY = Deno.env.get('MINO_API_KEY');
    if (!MINO_API_KEY) {
      throw new Error('MINO_API_KEY is not configured');
    }

    console.log(`Starting Mino agent for ${websiteName} (${websiteUrl}) - ${exam}`);

    const goal = `TASK: Extract ${exam} tutors from the given website.

RULES:
1) Understand the user's requirements and focus only on the relevant tutor information for ${exam}.
2) Stay on the page and do not click any other link until it is extremely necessary.
3) Read the information by opening the page if the links are given.
4) Avoid unnecessary navigation; be fast and efficient.
5) If a field is not visible for one listing, then go to the next one.
6) Extract up to 10 tutors maximum.

Return JSON:
{
  "tutors": [
    {
      "tutorName": "Full name or display name",
      "examsTaught": ["${exam}"],
      "subjects": ["Math", "Physics", "Verbal"],
      "teachingMode": "Online / Offline / Hybrid / null",
      "location": "City / Country or null",
      "experience": "X years or null",
      "qualifications": "Degrees / certifications or null",
      "pricing": "$XX/hour or null",
      "pastResults": "Score improvements / achievements or null",
      "contactMethod": "Email / Phone / Platform booking / Website link / null",
      "profileLink": "Direct tutor profile URL or null",
      "sourceWebsite": "${websiteName}"
    }
  ]
}`;

    // Call Mino API with SSE streaming
    const minoResponse = await fetch('https://mino.ai/v1/automation/run-sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MINO_API_KEY,
      },
      body: JSON.stringify({
        url: websiteUrl,
        goal: goal,
      }),
    });

    if (!minoResponse.ok) {
      const errorText = await minoResponse.text();
      console.error('Mino API error:', minoResponse.status, errorText);
      throw new Error(`Mino API error: ${minoResponse.status}`);
    }

    // Stream the response back to the client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process Mino's SSE stream and forward to client
    (async () => {
      try {
        const reader = minoResponse.body?.getReader();
        if (!reader) {
          await writer.write(encoder.encode('data: {"type":"ERROR","message":"No response body"}\n\n'));
          await writer.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              // Forward the SSE event to the client
              await writer.write(encoder.encode(line + '\n'));
            }
          }
        }

        // Handle any remaining buffer
        if (buffer.trim()) {
          await writer.write(encoder.encode(buffer + '\n'));
        }

        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
      } catch (error) {
        console.error('Stream processing error:', error);
        try {
          await writer.write(encoder.encode(`data: {"type":"ERROR","message":"${error instanceof Error ? error.message : 'Unknown error'}"}\n\n`));
          await writer.close();
        } catch (e) {
          console.error('Failed to write error to stream:', e);
        }
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in search-tutors-mino:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
