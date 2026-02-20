import type { Allergen, DietaryPreference } from '@/types';

const ALLERGEN_LABELS: Record<Allergen, string> = {
  peanuts: 'peanuts/peanut oil',
  tree_nuts: 'tree nuts (almonds, cashews, walnuts)',
  shellfish: 'shellfish (shrimp, crab, lobster)',
  fish: 'fish/fish sauce',
  milk: 'milk/dairy/cheese/cream',
  lactose: 'lactose/dairy products',
  eggs: 'eggs/egg-based ingredients',
  wheat: 'wheat/wheat flour',
  gluten: 'gluten/wheat/barley/rye',
  soy: 'soy/soy sauce/tofu',
  sesame: 'sesame/sesame oil/tahini',
  mustard: 'mustard',
  celery: 'celery/celeriac',
  sulfites: 'sulfites/sulfur dioxide',
};

export function buildAgentGoal(
  restaurantName: string,
  city: string,
  allergens: Allergen[],
  preferences: DietaryPreference[]
): { url: string; goal: string } {
  const allergenList = allergens.map(a => ALLERGEN_LABELS[a]).join(', ');

  const allergenSection = allergens.length > 0
    ? `Focus on these user allergens: ${allergenList}
- Flag any review mentioning: ${allergenList}
- Note cross-contamination risk based on cuisine type`
    : 'Note any allergen or food safety mentions in reviews';

  const prefParts: string[] = [];
  if (preferences.includes('vegetarian')) prefParts.push('vegetarian options');
  if (preferences.includes('vegan')) prefParts.push('vegan options');
  if (preferences.includes('hygiene_sensitive')) prefParts.push('cleanliness and hygiene signals');
  if (preferences.includes('family_friendly')) prefParts.push('family-friendliness cues');
  if (preferences.includes('late_night')) prefParts.push('operating hours');
  if (preferences.includes('halal') || preferences.includes('kosher')) prefParts.push('halal/kosher mentions');
  if (preferences.includes('low_spice')) prefParts.push('mild/low-spice options');

  const prefLine = prefParts.length > 0
    ? `\nAlso note: ${prefParts.join(', ')}.`
    : '';

  const goal = `You are a fast food-safety research agent. Investigate "${restaurantName}" in ${city}. Stay ONLY on Google Maps — do NOT visit external websites.

STEP 1 — FIND THE RESTAURANT on Google Maps:
Search "${restaurantName} ${city}". Confirm the correct listing. Note: name, address, rating, review count, Google Maps URL.

STEP 2 — SAMPLE REVIEWS (keep it fast):
Open the Reviews tab. Read 8–12 recent reviews. Prioritize reviews that mention:
- Food poisoning, stomach illness, getting sick
- Allergic reactions, allergen incidents, cross-contamination
- Hygiene, cleanliness, kitchen conditions
- Staff responsiveness to dietary/allergen requests
${allergenSection}${prefLine}

STEP 3 — CHECK MENU IMAGES (if available on Maps):
Look at the Menu tab or Photos section on the Maps listing (3–4 images max). Note any visible allergen labels, dish ingredients, or menu diversity. Do NOT leave Google Maps.

STEP 4 — RETURN RESULTS as JSON:
{
  "restaurantName": "${restaurantName}",
  "googleMapsUrl": "the Google Maps URL",
  "address": "full address",
  "rating": 4.5,
  "totalReviews": 1234,
  "overallSafetyScore": 75,
  "confidenceLevel": "high",
  "allergenRisks": [
    { "allergen": "allergen_key", "riskLevel": "low", "details": "brief explanation", "menuMentions": 0, "reviewMentions": 1 }
  ],
  "allergenLabelingClarity": "good",
  "crossContaminationRisk": "moderate",
  "safetySignals": [
    { "category": "hygiene", "sentiment": "positive", "detail": "brief quote or summary", "source": "review" }
  ],
  "foodPoisoningMentions": 0,
  "hygieneScore": 80,
  "vegetarianFriendly": true,
  "veganFriendly": false,
  "dietaryAccommodation": "good",
  "fitExplanation": "2-3 sentence summary of fit for this user's needs",
  "pros": ["Pro 1", "Pro 2"],
  "cons": ["Con 1"],
  "menuDiversity": "good",
  "safeOptionsCount": 0,
  "dataSourcesUsed": ["Google Maps Reviews", "Google Maps Menu Photos"]
}

SCORING (overallSafetyScore 0–100): Start at 70. Subtract 5–15 per food-poisoning mention, 5–10 per high/critical allergen risk, 10 for poor labeling. Add 5–10 for excellent labeling or positive hygiene signals.
CONFIDENCE: "high" = 10+ reviews sampled + menu info. "medium" = 5–9 reviews. "low" = limited data.
Be factual — do not invent information.`;

  return {
    url: 'https://www.google.com/maps',
    goal,
  };
}
