import type { GenerationAnalytics, OpenRouterUsage } from '../types.js';
import type { ModelDefinition, PricingRules } from '../models/registry.js';

export interface ReplicatePredictionMetrics {
  predict_time?: number;
  total_time?: number;
}

export interface ReplicatePredictionContext {
  predictionId: string;
  metrics?: ReplicatePredictionMetrics;
  definition?: ModelDefinition;
  input?: Record<string, unknown>;
}

/**
 * Estimate Replicate cost from a model's pricing rules and the actual generation input.
 */
export function estimateReplicateCost(
  definition: ModelDefinition,
  input?: Record<string, unknown>,
): number | null {
  const rules = definition.pricingRules as PricingRules | undefined;
  if (!rules) return null;

  if (rules.basis === 'output_image_count' || rules.basis === 'approximate_per_run') {
    const numOutputs = (input?.['num_outputs'] as number | undefined) ?? 1;
    return rules.usdPerImage * numOutputs;
  }

  if (rules.basis === 'output_image_resolution') {
    const resolution = (input?.['resolution'] as string | undefined) ?? 'fallback';
    const tier = rules.tiers.find((t) => t.resolution === resolution)
      ?? rules.tiers.find((t) => t.resolution === 'fallback');
    return tier?.usdPerImage ?? null;
  }

  if (rules.basis === 'output_image_megapixels') {
    const width = (input?.['width'] as number | undefined) ?? 1024;
    const height = (input?.['height'] as number | undefined) ?? 1024;
    const megapixels = (width * height) / 1_000_000;
    const tier = rules.tiers.find((t) => megapixels <= t.maxMegapixels)
      ?? rules.tiers[rules.tiers.length - 1];
    return tier?.usdPerImage ?? null;
  }

  return null;
}

/**
 * Build the full GenerationAnalytics object from all available data.
 */
export function buildAnalytics(
  totalStartMs: number,
  openrouterDurationMs: number,
  openrouterUsage: OpenRouterUsage | null,
  replicateContext: ReplicatePredictionContext,
): GenerationAnalytics {
  const totalDurationMs = Date.now() - totalStartMs;
  const replicateDurationMs = replicateContext.metrics?.predict_time != null
    ? Math.round(replicateContext.metrics.predict_time * 1000)
    : 0;

  const openrouterCostUsd = openrouterUsage?.costUsd ?? null;
  const openrouterGenerationId = openrouterUsage?.generationId ?? null;

  const replicateEstimatedCostUsd = replicateContext.definition
    ? estimateReplicateCost(replicateContext.definition, replicateContext.input)
    : null;

  let totalEstimatedCostUsd: number | null = null;
  let costSource: GenerationAnalytics['costSource'] = 'unknown';

  if (openrouterCostUsd !== null && replicateEstimatedCostUsd !== null) {
    totalEstimatedCostUsd = openrouterCostUsd + replicateEstimatedCostUsd;
    costSource = 'actual+estimate';
  } else if (replicateEstimatedCostUsd !== null) {
    totalEstimatedCostUsd = replicateEstimatedCostUsd;
    costSource = 'estimate-only';
  }

  return {
    totalDurationMs,
    openrouterDurationMs,
    replicateDurationMs,
    openrouterUsage,
    openrouterCostUsd,
    openrouterGenerationId,
    replicatePredictionId: replicateContext.predictionId,
    replicateEstimatedCostUsd,
    totalEstimatedCostUsd,
    costSource,
  };
}
