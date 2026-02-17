/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, guests, checkIn, checkOut } = await req.json();

    if (!city || !guests) {
      return new Response(
        JSON.stringify({ error: 'City and guests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Format dates for URL parameters
    const formatDateForUrl = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    const checkInFormatted = formatDateForUrl(checkIn);
    const checkOutFormatted = formatDateForUrl(checkOut);

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an expert travel assistant with deep knowledge of hotel booking platforms worldwide.

For the city "${city}", ${guests} guests, check-in "${checkInFormatted || 'tomorrow'}" and check-out "${checkOutFormatted || 'day after tomorrow'}", generate a JSON array of hotel booking platform SEARCH URLs.

IMPORTANT - REGIONAL PLATFORM SELECTION:
- First, identify which COUNTRY and REGION the city "${city}" is in.
- Only include platforms that actually operate and have inventory in that region.

PLATFORM AVAILABILITY BY REGION:
- **Global platforms** (include for ALL cities): Booking.com, Expedia, Hotels.com, Airbnb
- **Asia-Pacific focus** (include for Asia/SEA cities): Agoda, Trip.com
- **India only** (ONLY include for Indian cities): MakeMyTrip, Goibibo, OYO
- **Europe focus** (include for European cities): Booking.com, Trivago
- **US focus** (include for US cities): Kayak, Priceline

For "${city}":
1. Determine the country/region
2. Select 5-8 platforms that actually have hotel listings in that area
3. Construct proper search URLs with the city name, guest count, check-in and check-out dates encoded

For each platform:
- Construct the correct search URL for searching hotels in "${city}"
- INCLUDE check-in date (${checkInFormatted || 'tomorrow'}) and check-out date (${checkOutFormatted || 'day after tomorrow'}) in URL parameters
- Encode city, guest count, and dates properly in the URL query parameters
- Use the search results page URL (not homepage)
- Make sure URLs are valid and properly encoded

Return ONLY valid JSON in this exact format, no markdown or code blocks:
[
  {
    "id": "platform-id",
    "name": "Platform Name",
    "searchUrl": "https://platform.com/search?destination=city&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=N"
  }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      // Fall back to region-aware platforms when Gemini fails
      console.log('Using fallback platforms due to Gemini API error');
      const platforms = generateFallbackPlatforms(city, guests, checkIn, checkOut);
      return new Response(
        JSON.stringify({ platforms }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the JSON from the response
    let platforms = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        platforms = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse platforms:', parseError, 'Raw text:', text);
      // Return fallback platforms if parsing fails
      platforms = generateFallbackPlatforms(city, guests, checkIn, checkOut);
    }

    return new Response(
      JSON.stringify({ platforms }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in discover-platforms:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Indian cities for regional detection
const indianCities = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad',
  'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane',
  'bhopal', 'visakhapatnam', 'pimpri', 'patna', 'vadodara', 'goa', 'panaji',
  'kochi', 'coimbatore', 'surat', 'agra', 'varanasi', 'mysore', 'udaipur', 'jodhpur',
  'shimla', 'manali', 'rishikesh', 'darjeeling', 'ooty', 'munnar', 'gurgaon', 'noida'
];

// Asia-Pacific cities
const asiaCities = [
  'tokyo', 'bangkok', 'singapore', 'hong kong', 'kuala lumpur', 'seoul', 'osaka',
  'taipei', 'manila', 'jakarta', 'ho chi minh', 'hanoi', 'bali', 'phuket', 'chiang mai',
  'sydney', 'melbourne', 'auckland', 'perth', 'brisbane', 'shanghai', 'beijing',
  'guangzhou', 'shenzhen', 'macau', 'siem reap', 'phnom penh', 'vientiane', 'yangon'
];

function isIndianCity(city: string): boolean {
  return indianCities.some(c => city.toLowerCase().includes(c));
}

function isAsiaCity(city: string): boolean {
  return asiaCities.some(c => city.toLowerCase().includes(c)) || isIndianCity(city);
}

function generateFallbackPlatforms(city: string, guests: number, checkIn?: string, checkOut?: string) {
  const encodedCity = encodeURIComponent(city);
  const isIndia = isIndianCity(city);
  const isAsia = isAsiaCity(city);
  
  // Format dates for URL parameters
  const formatDateForUrl = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  const checkInFormatted = formatDateForUrl(checkIn);
  const checkOutFormatted = formatDateForUrl(checkOut);
  
  const platforms = [];
  
  // Global platforms - always include
  platforms.push({
    id: "booking",
    name: "Booking.com",
    searchUrl: `https://www.booking.com/searchresults.html?ss=${encodedCity}&group_adults=${guests}${checkInFormatted ? `&checkin=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkout=${checkOutFormatted}` : ''}`
  });
  
  platforms.push({
    id: "expedia",
    name: "Expedia",
    searchUrl: `https://www.expedia.com/Hotel-Search?destination=${encodedCity}&adults=${guests}${checkInFormatted ? `&startDate=${checkInFormatted}` : ''}${checkOutFormatted ? `&endDate=${checkOutFormatted}` : ''}`
  });
  
  platforms.push({
    id: "hotels",
    name: "Hotels.com",
    searchUrl: `https://www.hotels.com/search.do?destination=${encodedCity}&adults=${guests}${checkInFormatted ? `&checkIn=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkOut=${checkOutFormatted}` : ''}`
  });
  
  platforms.push({
    id: "airbnb",
    name: "Airbnb",
    searchUrl: `https://www.airbnb.com/s/${encodedCity}/homes?adults=${guests}${checkInFormatted ? `&checkin=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkout=${checkOutFormatted}` : ''}`
  });
  
  // Asia-Pacific platforms
  if (isAsia) {
    platforms.push({
      id: "agoda",
      name: "Agoda",
      searchUrl: `https://www.agoda.com/search?city=${encodedCity}&adults=${guests}${checkInFormatted ? `&checkIn=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkOut=${checkOutFormatted}` : ''}`
    });
    
    platforms.push({
      id: "trip",
      name: "Trip.com",
      searchUrl: `https://www.trip.com/hotels/list?city=${encodedCity}&adult=${guests}${checkInFormatted ? `&checkin=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkout=${checkOutFormatted}` : ''}`
    });
  }
  
  // India-specific platforms
  if (isIndia) {
    platforms.push({
      id: "makemytrip",
      name: "MakeMyTrip",
      searchUrl: `https://www.makemytrip.com/hotels/hotel-listing/?city=${encodedCity}&guests=${guests}${checkInFormatted ? `&checkin=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkout=${checkOutFormatted}` : ''}`
    });
    
    platforms.push({
      id: "goibibo",
      name: "Goibibo",
      searchUrl: `https://www.goibibo.com/hotels/hotels-in-${encodedCity.toLowerCase()}/?guests=${guests}${checkInFormatted ? `&ci=${checkInFormatted}` : ''}${checkOutFormatted ? `&co=${checkOutFormatted}` : ''}`
    });
    
    platforms.push({
      id: "oyo",
      name: "OYO",
      searchUrl: `https://www.oyorooms.com/search?city=${encodedCity}&guests=${guests}${checkInFormatted ? `&checkin=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkout=${checkOutFormatted}` : ''}`
    });
  }
  
  // Non-Asia: add Kayak and Trivago
  if (!isAsia) {
    platforms.push({
      id: "kayak",
      name: "Kayak",
      searchUrl: `https://www.kayak.com/hotels/${encodedCity}/${guests}guests${checkInFormatted ? `/${checkInFormatted}` : ''}${checkOutFormatted ? `/${checkOutFormatted}` : ''}`
    });
    
    platforms.push({
      id: "trivago",
      name: "Trivago",
      searchUrl: `https://www.trivago.com/en-US/srl?search=${encodedCity}&adults=${guests}${checkInFormatted ? `&checkin=${checkInFormatted}` : ''}${checkOutFormatted ? `&checkout=${checkOutFormatted}` : ''}`
    });
  }
  
  return platforms;
}
