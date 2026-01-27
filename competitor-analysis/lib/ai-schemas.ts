import { z } from 'zod';

// Schema for URL generation
export const urlGenerationSchema = z.object({
  companies: z.array(z.object({
    name: z.string(),
    url: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  })),
});

export type UrlGenerationResult = z.infer<typeof urlGenerationSchema>;

// Simplified schema for pricing analysis - focuses on what the dashboard needs
export const pricingAnalysisSchema = z.object({
  insights: z.array(z.string()).describe('Key market insights about pricing trends'),
  recommendations: z.array(z.string()).describe('Strategic recommendations for pricing'),
  pricingModelBreakdown: z.record(z.string(), z.number()).describe('Count of each pricing model type'),
  normalizedPrices: z.record(z.string(), z.object({
    pricingModel: z.string(),
    normalizedCostPerWorkflow: z.number().nullable(),
  })).optional().describe('Normalized price per competitor'),
});

export type PricingAnalysisResult = z.infer<typeof pricingAnalysisSchema>;
