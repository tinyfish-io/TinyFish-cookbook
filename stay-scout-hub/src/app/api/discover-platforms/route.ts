export const runtime = "nodejs";
export const maxDuration = 60;

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const indianCities = ["mumbai","delhi","bangalore","bengaluru","chennai","kolkata","hyderabad","pune","ahmedabad","jaipur","lucknow","kanpur","nagpur","indore","thane","bhopal","visakhapatnam","patna","vadodara","goa","panaji","kochi","coimbatore","surat","agra","varanasi","mysore","udaipur","jodhpur","shimla","manali","rishikesh","darjeeling","ooty","munnar","gurgaon","noida"];
const asiaCities = ["tokyo","bangkok","singapore","hong kong","kuala lumpur","seoul","osaka","taipei","manila","jakarta","ho chi minh","hanoi","bali","phuket","chiang mai","sydney","melbourne","auckland","perth","brisbane","shanghai","beijing","guangzhou","shenzhen","macau","siem reap","phnom penh","vientiane","yangon"];

function isIndianCity(city: string) { return indianCities.some(c => city.toLowerCase().includes(c)); }
function isAsiaCity(city: string) { return asiaCities.some(c => city.toLowerCase().includes(c)) || isIndianCity(city); }

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function generateFallbackPlatforms(city: string, guests: number, checkIn?: string, checkOut?: string) {
  const enc = encodeURIComponent(city);
  const ci = formatDate(checkIn);
  const co = formatDate(checkOut);
  const isIndia = isIndianCity(city);
  const isAsia = isAsiaCity(city);
  const platforms = [
    { id: "booking", name: "Booking.com", searchUrl: `https://www.booking.com/searchresults.html?ss=${enc}&group_adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
    { id: "expedia", name: "Expedia", searchUrl: `https://www.expedia.com/Hotel-Search?destination=${enc}&adults=${guests}${ci ? `&startDate=${ci}` : ""}${co ? `&endDate=${co}` : ""}` },
    { id: "hotels", name: "Hotels.com", searchUrl: `https://www.hotels.com/search.do?destination=${enc}&adults=${guests}${ci ? `&checkIn=${ci}` : ""}${co ? `&checkOut=${co}` : ""}` },
    { id: "airbnb", name: "Airbnb", searchUrl: `https://www.airbnb.com/s/${enc}/homes?adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` },
  ];
  if (isAsia) {
    platforms.push({ id: "agoda", name: "Agoda", searchUrl: `https://www.agoda.com/search?city=${enc}&adults=${guests}${ci ? `&checkIn=${ci}` : ""}${co ? `&checkOut=${co}` : ""}` });
    platforms.push({ id: "trip", name: "Trip.com", searchUrl: `https://www.trip.com/hotels/list?city=${enc}&adult=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` });
  }
  if (isIndia) {
    platforms.push({ id: "makemytrip", name: "MakeMyTrip", searchUrl: `https://www.makemytrip.com/hotels/hotel-listing/?city=${enc}&guests=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` });
    platforms.push({ id: "oyo", name: "OYO", searchUrl: `https://www.oyorooms.com/search?city=${enc}&guests=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` });
  }
  if (!isAsia) {
    platforms.push({ id: "kayak", name: "Kayak", searchUrl: `https://www.kayak.com/hotels/${enc}/${guests}guests${ci ? `/${ci}` : ""}${co ? `/${co}` : ""}` });
    platforms.push({ id: "trivago", name: "Trivago", searchUrl: `https://www.trivago.com/en-US/srl?search=${enc}&adults=${guests}${ci ? `&checkin=${ci}` : ""}${co ? `&checkout=${co}` : ""}` });
  }
  return platforms;
}

export async function POST(request: Request) {
  const { city, guests, checkIn, checkOut } = await request.json();

  if (!city || !guests) return Response.json({ error: "City and guests are required" }, { status: 400 });

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ platforms: generateFallbackPlatforms(city, guests, checkIn, checkOut) });
  }

  const ci = formatDate(checkIn);
  const co = formatDate(checkOut);

  const prompt = `You are an expert travel assistant with deep knowledge of hotel booking platforms worldwide.

For the city "${city}", ${guests} guests, check-in "${ci || "tomorrow"}" and check-out "${co || "day after tomorrow"}", generate a JSON array of hotel booking platform SEARCH URLs.

IMPORTANT - REGIONAL PLATFORM SELECTION:
- First, identify which COUNTRY and REGION the city "${city}" is in.
- Only include platforms that actually operate and have inventory in that region.

PLATFORM AVAILABILITY:
- Global (ALL cities): Booking.com, Expedia, Hotels.com, Airbnb
- Asia-Pacific: Agoda, Trip.com
- India only: MakeMyTrip, Goibibo, OYO
- Europe: Trivago
- US: Kayak, Priceline

Select 5-8 platforms that actually have hotel listings in "${city}" and construct proper search URLs with city, guest count, check-in and check-out dates.

Return ONLY valid JSON — no markdown, no code blocks:
[
  {
    "id": "platform-id",
    "name": "Platform Name",
    "searchUrl": "https://platform.com/search?destination=city&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=N"
  }
]`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content || "";
    let platforms = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) platforms = JSON.parse(jsonMatch[0]);
      else throw new Error("No JSON array found");
    } catch {
      platforms = generateFallbackPlatforms(city, guests, checkIn, checkOut);
    }

    return Response.json({ platforms });
  } catch {
    return Response.json({ platforms: generateFallbackPlatforms(city, guests, checkIn, checkOut) });
  }
}
