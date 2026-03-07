import type { RestaurantSafetyData, Allergen, DietaryPreference } from '@/types';

export function calculateAdjustedScore(
  data: RestaurantSafetyData,
  allergens: Allergen[],
  preferences: DietaryPreference[]
): number {
  let score = data.overallSafetyScore;

  for (const risk of data.allergenRisks) {
    if (allergens.includes(risk.allergen)) {
      switch (risk.riskLevel) {
        case 'critical': score -= 15; break;
        case 'high': score -= 10; break;
        case 'moderate': score -= 5; break;
        case 'low': score += 2; break;
      }
    }
  }

  if (preferences.includes('vegetarian') && !data.vegetarianFriendly) score -= 10;
  if (preferences.includes('vegan') && !data.veganFriendly) score -= 10;
  if (preferences.includes('hygiene_sensitive')) {
    score += Math.round((data.hygieneScore - 70) / 5);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-risk-low';
  if (score >= 40) return 'text-risk-moderate';
  return 'text-risk-critical';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Critical';
}
