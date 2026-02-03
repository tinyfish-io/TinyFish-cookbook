/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINO_API_KEY = Deno.env.get('MINO_API_KEY');
const MINO_API_URL = 'https://mino.ai/v1/automation/run-sse';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, params } = await req.json();

    if (!platform || !params) {
      return new Response(
        JSON.stringify({ error: 'Platform and params are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!MINO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'MINO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { city, checkIn, checkOut, guests } = params;

    // Helper to format dates for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Helper to format dates for URL parameters
    const formatDateForUrl = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    // Build a fallback search URL with all params
    const buildSearchUrlWithParams = (baseUrl: string) => {
      const encodedCity = encodeURIComponent(city);
      const checkInParam = checkIn ? formatDateForUrl(checkIn) : '';
      const checkOutParam = checkOut ? formatDateForUrl(checkOut) : '';
      
      // Try to add dates to known platforms
      const url = new URL(baseUrl);
      const lowerUrl = baseUrl.toLowerCase();
      
      if (lowerUrl.includes('booking.com')) {
        if (checkInParam) url.searchParams.set('checkin', checkInParam);
        if (checkOutParam) url.searchParams.set('checkout', checkOutParam);
      } else if (lowerUrl.includes('expedia.com')) {
        if (checkInParam) url.searchParams.set('startDate', checkInParam);
        if (checkOutParam) url.searchParams.set('endDate', checkOutParam);
      } else if (lowerUrl.includes('hotels.com')) {
        if (checkInParam) url.searchParams.set('checkIn', checkInParam);
        if (checkOutParam) url.searchParams.set('checkOut', checkOutParam);
      } else if (lowerUrl.includes('airbnb.com')) {
        if (checkInParam) url.searchParams.set('checkin', checkInParam);
        if (checkOutParam) url.searchParams.set('checkout', checkOutParam);
      } else if (lowerUrl.includes('agoda.com')) {
        if (checkInParam) url.searchParams.set('checkIn', checkInParam);
        if (checkOutParam) url.searchParams.set('checkOut', checkOutParam);
      } else if (lowerUrl.includes('makemytrip.com')) {
        if (checkInParam) url.searchParams.set('checkin', checkInParam);
        if (checkOutParam) url.searchParams.set('checkout', checkOutParam);
      } else if (lowerUrl.includes('goibibo.com')) {
        if (checkInParam) url.searchParams.set('ci', checkInParam);
        if (checkOutParam) url.searchParams.set('co', checkOutParam);
      } else {
        // Generic fallback
        if (checkInParam) url.searchParams.set('checkin', checkInParam);
        if (checkOutParam) url.searchParams.set('checkout', checkOutParam);
      }
      
      return url.toString();
    };

    // Comprehensive step-by-step goal prompt
    const goal = `You are searching for hotels on ${platform.name}.

Inputs:
- City: ${city}
- Check-in date: ${checkIn ? formatDate(checkIn) : 'Tomorrow'}
- Check-out date: ${checkOut ? formatDate(checkOut) : 'Day after tomorrow'}
- Number of guests: ${guests}

STEP 1 – LOCATION INPUT:
If a city or destination field is present, enter the city name "${city}".

STEP 2 – DATE INPUT:
Select the exact check-in date (${checkIn ? formatDate(checkIn) : 'tomorrow'}) and check-out date (${checkOut ? formatDate(checkOut) : 'day after tomorrow'}).

STEP 3 – GUEST INPUT:
Set the number of guests to ${guests}.

STEP 4 – SEARCH:
Click the search or find hotels button.

STEP 5 – FINAL STATE:
Wait until the hotel search results page is fully visible.

RETURN JSON ONLY:
{
  "platform": "${platform.name}",
  "search_results_url": "Current page URL after search",
  "available": true
}`;

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (type: string, data?: unknown, message?: string) => {
      const event = JSON.stringify({ type, data, message });
      await writer.write(encoder.encode(`data: ${event}\n\n`));
    };

    // Start the async processing
    (async () => {
      try {
        await sendEvent('CONNECTED', null, `Starting search on ${platform.name}...`);

        // Call Mino API with SSE endpoint
        const minoResponse = await fetch(MINO_API_URL, {
          method: 'POST',
          headers: {
            'X-API-Key': MINO_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: platform.searchUrl,
            goal: goal,
          }),
        });

        if (!minoResponse.ok) {
          const errorText = await minoResponse.text();
          console.error(`Mino API error for ${platform.name}:`, errorText);
          await sendEvent('ERROR', null, `Failed to search ${platform.name}: ${minoResponse.status}`);
          await writer.close();
          return;
        }

        // Handle SSE response from Mino (following TinyFish pattern)
        const reader = minoResponse.body?.getReader();
        if (!reader) {
          await sendEvent('ERROR', null, 'No response body from Mino');
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
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              
              // Forward status updates
              if (data.type === 'STATUS' && data.message) {
                await sendEvent('STATUS', null, data.message);
              }

              // Handle streamingUrl for live browser preview
              if (data.streamingUrl) {
                await sendEvent('SCREENSHOT', { streamingUrl: data.streamingUrl });
              }
              
              // Handle COMPLETE with resultJson
              if (data.type === 'COMPLETE') {
                const result = data.resultJson || data;
                let searchResultsUrl = platform.searchUrl;
                
                // Try to extract the final URL from the result
                if (typeof result === 'object') {
                  searchResultsUrl = result.search_results_url || result.url || result.booking_link || platform.searchUrl;
                } else if (typeof result === 'string') {
                  try {
                    const parsed = JSON.parse(result);
                    searchResultsUrl = parsed.search_results_url || parsed.url || platform.searchUrl;
                  } catch {
                    // Keep default URL
                  }
                }
                
                // If the URL is still the base URL without search params, add dates
                if (searchResultsUrl === platform.searchUrl || !searchResultsUrl.includes('check')) {
                  searchResultsUrl = buildSearchUrlWithParams(searchResultsUrl);
                }
                
                const hotelsFound = result.hotels_found ?? result.hotelsFound ?? 0;
                await sendEvent('COMPLETE', {
                  available: (result.available ?? hotelsFound > 0) || true,
                  hotelsFound: hotelsFound,
                  searchResultsUrl: searchResultsUrl,
                  message: result.message || `Search completed on ${platform.name}`,
                });
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                await writer.close();
                return;
              }
              
              // Handle raw result/output fields (alternative Mino response format)
              const responseText = data.result || data.output || data.text;
              if (responseText && typeof responseText === 'string') {
                const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  const hotelsFound = parsed.hotels_found ?? 0;
                  let searchResultsUrl = parsed.search_results_url || platform.searchUrl;
                  
                  // Add dates if missing
                  if (searchResultsUrl === platform.searchUrl || !searchResultsUrl.includes('check')) {
                    searchResultsUrl = buildSearchUrlWithParams(searchResultsUrl);
                  }
                  
                  await sendEvent('COMPLETE', {
                    available: parsed.available ?? hotelsFound > 0,
                    hotelsFound: hotelsFound,
                    searchResultsUrl: searchResultsUrl,
                    message: `Found ${hotelsFound} hotels`,
                  });
                  await writer.write(encoder.encode('data: [DONE]\n\n'));
                  await writer.close();
                  return;
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        // If we get here without a COMPLETE event, send a fallback with proper URL
        const fallbackUrl = buildSearchUrlWithParams(platform.searchUrl);
        await sendEvent('COMPLETE', {
          available: true,
          hotelsFound: 0,
          searchResultsUrl: fallbackUrl,
          message: 'Search completed - click to view results',
        });
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();

      } catch (error: unknown) {
        console.error(`Error processing ${platform.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await sendEvent('ERROR', null, errorMessage);
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Error in check-platform:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
