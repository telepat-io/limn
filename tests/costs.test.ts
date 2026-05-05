import { describe, it, expect } from '@jest/globals';
import { estimateReplicateCost, buildAnalytics } from '../src/core/costs.js';
import type { ModelDefinition } from '../src/models/registry.js';

function makeDefinition(pricingRules: ModelDefinition['pricingRules']): ModelDefinition {
  return {
    modelId: 'test/model',
    provider: 'test',
    displayName: 'Test',
    category: 'image',
    pricing: { usdPerSecond: null, usdPer1kInputTokens: null, usdPer1kOutputTokens: null },
    pricingRules,
    inputOptions: { userConfigurable: [], pipelineManaged: ['aspect_ratio'], fields: {} },
  };
}

describe('estimateReplicateCost', () => {
  it('returns null when no pricingRules', () => {
    const def = makeDefinition(undefined);
    expect(estimateReplicateCost(def)).toBeNull();
  });

  it('output_image_count: single image', () => {
    const def = makeDefinition({ basis: 'output_image_count', usdPerImage: 0.003 });
    expect(estimateReplicateCost(def)).toBe(0.003);
  });

  it('output_image_count: multiple images', () => {
    const def = makeDefinition({ basis: 'output_image_count', usdPerImage: 0.003 });
    expect(estimateReplicateCost(def, { num_outputs: 4 })).toBe(0.012);
  });

  it('approximate_per_run: uses usdPerImage as flat fee', () => {
    const def = makeDefinition({ basis: 'approximate_per_run', usdPerImage: 0.05 });
    expect(estimateReplicateCost(def)).toBe(0.05);
  });

  it('output_image_resolution: matches resolution tier', () => {
    const def = makeDefinition({
      basis: 'output_image_resolution',
      tiers: [
        { resolution: '1K', usdPerImage: 0.15 },
        { resolution: '4K', usdPerImage: 0.30 },
      ],
    });
    expect(estimateReplicateCost(def, { resolution: '4K' })).toBe(0.30);
  });

  it('output_image_resolution: fallback tier when resolution not found', () => {
    const def = makeDefinition({
      basis: 'output_image_resolution',
      tiers: [
        { resolution: '1K', usdPerImage: 0.15 },
        { resolution: 'fallback', usdPerImage: 0.20 },
      ],
    });
    expect(estimateReplicateCost(def, { resolution: 'unknown' })).toBe(0.20);
  });

  it('output_image_megapixels: selects correct tier', () => {
    const def = makeDefinition({
      basis: 'output_image_megapixels',
      tiers: [
        { maxMegapixels: 1, usdPerImage: 0.01 },
        { maxMegapixels: 4, usdPerImage: 0.02 },
      ],
    });
    // 1024x1024 = 1.048576 MP → second tier
    expect(estimateReplicateCost(def, { width: 1024, height: 1024 })).toBe(0.02);
    // 512x512 = 0.262 MP → first tier
    expect(estimateReplicateCost(def, { width: 512, height: 512 })).toBe(0.01);
  });
});

describe('buildAnalytics', () => {
  it('builds analytics with actual+estimate cost source', () => {
    const startMs = Date.now() - 3000;
    const usage = { promptTokens: 10, completionTokens: 50, totalTokens: 60, costUsd: 0.0002, generationId: 'or-abc' };
    const def = makeDefinition({ basis: 'output_image_count', usdPerImage: 0.003 });
    const result = buildAnalytics(startMs, 1000, usage, {
      predictionId: 'rep-xyz',
      metrics: { predict_time: 2.0 },
      definition: def,
    });

    expect(result.openrouterDurationMs).toBe(1000);
    expect(result.replicateDurationMs).toBe(2000);
    expect(result.openrouterCostUsd).toBe(0.0002);
    expect(result.replicateEstimatedCostUsd).toBe(0.003);
    expect(result.totalEstimatedCostUsd).toBeCloseTo(0.0032);
    expect(result.costSource).toBe('actual+estimate');
    expect(result.replicatePredictionId).toBe('rep-xyz');
    expect(result.openrouterGenerationId).toBe('or-abc');
  });

  it('builds analytics with estimate-only when no OR cost', () => {
    const startMs = Date.now() - 2000;
    const usage = { promptTokens: 10, completionTokens: 50, totalTokens: 60, costUsd: null, generationId: null };
    const def = makeDefinition({ basis: 'output_image_count', usdPerImage: 0.003 });
    const result = buildAnalytics(startMs, 500, usage, {
      predictionId: 'rep-abc',
      definition: def,
    });

    expect(result.costSource).toBe('estimate-only');
    expect(result.totalEstimatedCostUsd).toBe(0.003);
    expect(result.openrouterCostUsd).toBeNull();
  });

  it('builds analytics with unknown cost source when no definition', () => {
    const startMs = Date.now() - 1000;
    const result = buildAnalytics(startMs, 500, null, { predictionId: 'rep-123' });
    expect(result.costSource).toBe('unknown');
    expect(result.totalEstimatedCostUsd).toBeNull();
    expect(result.openrouterUsage).toBeNull();
  });
});
