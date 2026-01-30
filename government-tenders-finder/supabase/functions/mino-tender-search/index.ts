const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sector, url, agentId } = await req.json();

    if (!sector || !url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sector and URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('MINO_API_KEY');
    if (!apiKey) {
      console.error('MINO_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Mino API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const goal = `TASK: Extract government tenders in Singapore for the field of ${sector}.

CURRENT DATE: ${currentDate}
IMPORTANT: Only return tenders with submission deadlines that are AFTER today's date.

RULES:
1) Focus only on relevant tender information for ${sector}
2) Stay on the page and minimize navigation
3) Scroll through the page to find tenders
4) Be fast and efficient
5) Find tenders with upcoming deadlines

Return JSON:
{
  "tenderdetails": [
    {
      "Tender Title": "Full title of the tender",
      "Tender ID": "Official tender reference number",
      "Issuing Authority": "Government agency",
      "Country / Region": "Singapore",
      "Tender Type": "Open/Selective/Limited",
      "Publication Date": "Date published",
      "Submission Deadline": "Last date to submit",
      "Tender Status": "Open/Closed",
      "Official Tender URL": "Direct link",
      "Brief Description": "Short summary",
      "Eligibility Criteria": "Requirements",
      "Industry / Category": "${sector}"
    }
  ]
}`;

    console.log(`[${agentId}] Starting Mino agent for ${url}`);

    // Create a streaming response to forward Mino's SSE events
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://mino.ai/v1/automation/run-sse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
            },
            body: JSON.stringify({ url, goal }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${agentId}] Mino API error:`, response.status, errorText);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'ERROR', 
              agentId, 
              error: `Mino API error: ${response.status}` 
            })}\n\n`));
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    // Forward streamingUrl immediately
                    if (data.streamingUrl) {
                      console.log(`[${agentId}] Got streaming URL:`, data.streamingUrl);
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'STREAMING_URL', 
                        agentId, 
                        streamingUrl: data.streamingUrl 
                      })}\n\n`));
                    }

                    // Forward status updates
                    if (data.type === 'STATUS' && data.message) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'STATUS', 
                        agentId, 
                        message: data.message 
                      })}\n\n`));
                    }

                    // Forward completion with results
                    if (data.type === 'COMPLETE') {
                      let tenders: any[] = [];
                      let resultJson = data.resultJson;
                      
                      if (resultJson) {
                        if (typeof resultJson === 'string') {
                          try {
                            const jsonMatch = resultJson.match(/```json\s*([\s\S]*?)\s*```/) || 
                                             resultJson.match(/```\s*([\s\S]*?)\s*```/);
                            if (jsonMatch) {
                              resultJson = JSON.parse(jsonMatch[1]);
                            } else {
                              resultJson = JSON.parse(resultJson);
                            }
                          } catch (e) {
                            console.error(`[${agentId}] Failed to parse resultJson`);
                          }
                        }
                        
                        if (resultJson?.tenderdetails && Array.isArray(resultJson.tenderdetails)) {
                          tenders = resultJson.tenderdetails;
                        } else if (Array.isArray(resultJson)) {
                          tenders = resultJson;
                        }
                      }

                      console.log(`[${agentId}] Complete with ${tenders.length} tenders`);
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'COMPLETE', 
                        agentId, 
                        tenders 
                      })}\n\n`));
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'DONE', agentId })}\n\n`));
          controller.close();
        } catch (error) {
          console.error(`[${agentId}] Stream error:`, error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'ERROR', 
            agentId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in mino-tender-search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
