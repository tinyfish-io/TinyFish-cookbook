export interface TinyFishRequestConfig {
  url: string;
  goal: string;
}

// Normalize the raw SDK result so all array fields the UI depends on always exist
function normalizeResult(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  return {
    restaurantName: r.restaurantName ?? r.restaurant_name ?? '',
    googleMapsUrl: r.googleMapsUrl ?? r.google_maps_url ?? '',
    address: r.address ?? '',
    rating: r.rating ?? null,
    totalReviews: r.totalReviews ?? r.total_reviews ?? null,
    overallSafetyScore: Number(r.overallSafetyScore ?? r.overall_safety_score ?? 70),
    confidenceLevel: r.confidenceLevel ?? r.confidence_level ?? 'medium',
    allergenRisks: Array.isArray(r.allergenRisks) ? r.allergenRisks
      : Array.isArray(r.allergen_risks) ? r.allergen_risks : [],
    allergenLabelingClarity: r.allergenLabelingClarity ?? r.allergen_labeling_clarity ?? 'poor',
    crossContaminationRisk: r.crossContaminationRisk ?? r.cross_contamination_risk ?? 'moderate',
    safetySignals: Array.isArray(r.safetySignals) ? r.safetySignals
      : Array.isArray(r.safety_signals) ? r.safety_signals : [],
    foodPoisoningMentions: Number(r.foodPoisoningMentions ?? r.food_poisoning_mentions ?? 0),
    hygieneScore: Number(r.hygieneScore ?? r.hygiene_score ?? 70),
    vegetarianFriendly: Boolean(r.vegetarianFriendly ?? r.vegetarian_friendly ?? false),
    veganFriendly: Boolean(r.veganFriendly ?? r.vegan_friendly ?? false),
    dietaryAccommodation: r.dietaryAccommodation ?? r.dietary_accommodation ?? 'limited',
    fitExplanation: r.fitExplanation ?? r.fit_explanation ?? '',
    pros: Array.isArray(r.pros) ? r.pros : [],
    cons: Array.isArray(r.cons) ? r.cons : [],
    menuDiversity: r.menuDiversity ?? r.menu_diversity ?? 'limited',
    safeOptionsCount: Number(r.safeOptionsCount ?? r.safe_options_count ?? 0),
    dataSourcesUsed: Array.isArray(r.dataSourcesUsed) ? r.dataSourcesUsed
      : Array.isArray(r.data_sources_used) ? r.data_sources_used : [],
    analysisTimestamp: r.analysisTimestamp ?? r.analysis_timestamp ?? new Date().toISOString(),
  };
}

export type SSECallbacks = {
  onStep: (event: { purpose?: string; action?: string; message?: string }) => void;
  onComplete: (resultJson: unknown) => void;
  onError: (error: string) => void;
  onStreamingUrl: (url: string) => void;
};

export function startTinyFishAgent(
  config: TinyFishRequestConfig,
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === 'STREAMING_URL' && event.streamingUrl) {
            callbacks.onStreamingUrl(String(event.streamingUrl));
          } else if (event.type === 'STEP') {
            callbacks.onStep({ purpose: event.purpose as string });
          } else if (event.type === 'COMPLETE') {
            callbacks.onComplete(normalizeResult(event.resultJson) ?? null);
            return;
          } else if (event.type === 'ERROR') {
            callbacks.onError(String(event.message ?? 'Unknown error'));
            return;
          }
        }
      }

      callbacks.onError('Agent stream ended unexpectedly');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        callbacks.onError((error as Error).message);
      }
    }
  };

  run();
  return controller;
}
