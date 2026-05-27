import { describe, it, expect } from '@jest/globals';
import {
  getGenerationInputMode,
  resolveReplicateModelId,
  FAMILY_REGISTRY,
  DEFINITIONS_BY_MODEL_ID,
  ASPECT_RATIO_DIMENSIONS,
  getSupportedModelCatalog,
  validateUserOption,
  getUserConfigurableFields,
  getSupportedAspectRatios,
  validateAspectRatio,
  resolveDimensions,
  getResolutionScale,
} from '../src/models/registry.js';
import type { ModelDefinition, FieldDefinition } from '../src/models/registry.js';

function makeDefinition(pipelineManaged: string[]): ModelDefinition {
  return {
    modelId: 'test/model',
    provider: 'test',
    displayName: 'Test',
    category: 'image',
    pricing: { usdPerSecond: null, usdPer1kInputTokens: null, usdPer1kOutputTokens: null },
    inputOptions: { userConfigurable: [], pipelineManaged, fields: {} },
  };
}

describe('getGenerationInputMode', () => {
  it('returns aspect_ratio for aspect_ratio only', () => {
    expect(getGenerationInputMode(makeDefinition(['aspect_ratio']))).toBe('aspect_ratio');
  });

  it('returns dimensions for width+height without aspect_ratio', () => {
    expect(getGenerationInputMode(makeDefinition(['width', 'height']))).toBe('dimensions');
  });

  it('returns custom_dimensions for all three', () => {
    expect(getGenerationInputMode(makeDefinition(['aspect_ratio', 'width', 'height']))).toBe('custom_dimensions');
  });
});

describe('resolveReplicateModelId', () => {
  it('returns default model for flux', () => {
    expect(resolveReplicateModelId('flux')).toBe('black-forest-labs/flux-schnell');
  });

  it('accepts a valid override', () => {
    expect(resolveReplicateModelId('flux', 'black-forest-labs/flux-2-pro')).toBe('black-forest-labs/flux-2-pro');
  });

  it('throws on invalid override', () => {
    expect(() => resolveReplicateModelId('flux', 'some/unknown-model')).toThrow();
  });
});

describe('FAMILY_REGISTRY', () => {
  it('has all expected families', () => {
    const keys = Object.keys(FAMILY_REGISTRY);
    expect(keys).toContain('flux');
    expect(keys).toContain('sdxl');
    expect(keys).toContain('qwen-image');
  });

  it('flux has generationEnabled=true', () => {
    expect(FAMILY_REGISTRY['flux'].generationEnabled).toBe(true);
  });
});

describe('DEFINITIONS_BY_MODEL_ID', () => {
  it('contains flux-schnell definition', () => {
    const def = DEFINITIONS_BY_MODEL_ID['black-forest-labs/flux-schnell'];
    expect(def).toBeDefined();
    expect(def.modelId).toBe('black-forest-labs/flux-schnell');
  });

  it('all definitions have required fields', () => {
    for (const [id, def] of Object.entries(DEFINITIONS_BY_MODEL_ID)) {
      expect(def.modelId).toBe(id);
      expect(def.displayName).toBeTruthy();
      expect(def.inputOptions).toBeDefined();
    }
  });
});

describe('ASPECT_RATIO_DIMENSIONS', () => {
  it('has standard ratios', () => {
    expect(ASPECT_RATIO_DIMENSIONS['1:1']).toEqual({ width: 1024, height: 1024 });
    expect(ASPECT_RATIO_DIMENSIONS['16:9']).toBeDefined();
    expect(ASPECT_RATIO_DIMENSIONS['9:16']).toBeDefined();
  });
});

describe('getSupportedModelCatalog', () => {
  it('returns a catalog entry for each family', () => {
    const catalog = getSupportedModelCatalog();
    expect(catalog).toHaveLength(Object.keys(FAMILY_REGISTRY).length);
  });

  it('contains required metadata fields', () => {
    const catalog = getSupportedModelCatalog();
    for (const entry of catalog) {
      expect(entry.family).toBeTruthy();
      expect(entry.displayName).toBeTruthy();
      expect(typeof entry.generationEnabled).toBe('boolean');
      expect(Array.isArray(entry.replicateModelIds)).toBe(true);
      expect('defaultReplicateModelId' in entry).toBe(true);
    }
  });

  it('marks wan-image as generation-enabled', () => {
    const wan = getSupportedModelCatalog().find((entry) => entry.family === 'wan-image');
    expect(wan).toBeDefined();
    expect(wan?.generationEnabled).toBe(true);
  });
});

function makeDefinitionWithFields(
  pipelineManaged: string[],
  userConfigurable: string[],
  fields: Record<string, FieldDefinition>,
): ModelDefinition {
  return {
    modelId: 'test/model',
    provider: 'test',
    displayName: 'Test',
    category: 'image',
    pricing: { usdPerSecond: null, usdPer1kInputTokens: null, usdPer1kOutputTokens: null },
    inputOptions: { userConfigurable, pipelineManaged, fields },
  };
}

describe('validateUserOption edge cases', () => {
  it('rejects null for non-nullable field', () => {
    const def = makeDefinitionWithFields([], ['seed'], { seed: { type: 'integer' } });
    const result = validateUserOption(def, 'seed', null);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('does not accept null values');
  });

  it('accepts null for nullable field', () => {
    const def = makeDefinitionWithFields([], ['seed'], { seed: { type: 'integer', nullable: true } });
    const result = validateUserOption(def, 'seed', null);
    expect(result.valid).toBe(true);
    expect(result.coerced).toBeNull();
  });

  it('rejects non-integer string for integer field', () => {
    const def = makeDefinitionWithFields([], ['seed'], { seed: { type: 'integer' } });
    expect(validateUserOption(def, 'seed', 'abc').valid).toBe(false);
  });

  it('rejects non-integer number for integer field', () => {
    const def = makeDefinitionWithFields([], ['seed'], { seed: { type: 'integer' } });
    expect(validateUserOption(def, 'seed', 1.5).valid).toBe(false);
  });

  it('rejects non-number string for number field', () => {
    const def = makeDefinitionWithFields([], ['strength'], { strength: { type: 'number' } });
    expect(validateUserOption(def, 'strength', 'abc').valid).toBe(false);
  });

  it('rejects non-number value for number field', () => {
    const def = makeDefinitionWithFields([], ['strength'], { strength: { type: 'number' } });
    expect(validateUserOption(def, 'strength', true).valid).toBe(false);
  });

  it('rejects invalid boolean strings', () => {
    const def = makeDefinitionWithFields([], ['go_fast'], { go_fast: { type: 'boolean' } });
    expect(validateUserOption(def, 'go_fast', 'yes').valid).toBe(false);
  });

  it('rejects non-boolean values for boolean field', () => {
    const def = makeDefinitionWithFields([], ['go_fast'], { go_fast: { type: 'boolean' } });
    expect(validateUserOption(def, 'go_fast', 1).valid).toBe(false);
  });

  it('rejects missing field schema', () => {
    const def = makeDefinitionWithFields([], ['seed'], {});
    const result = validateUserOption(def, 'seed', 1);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('No schema definition found');
  });

  it('rejects values below minimum', () => {
    const def = makeDefinitionWithFields([], ['num_outputs'], { num_outputs: { type: 'integer', minimum: 1 } });
    const result = validateUserOption(def, 'num_outputs', 0);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('at least 1');
  });

  it('rejects values above maximum', () => {
    const def = makeDefinitionWithFields([], ['num_outputs'], { num_outputs: { type: 'integer', maximum: 4 } });
    const result = validateUserOption(def, 'num_outputs', 5);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('at most 4');
  });

  it('throws when no default Replicate model is configured', () => {
    const original = FAMILY_REGISTRY['flux'];
    FAMILY_REGISTRY['flux'] = { ...original, defaultReplicateModelId: null };
    try {
      expect(() => resolveReplicateModelId('flux')).toThrow('No default Replicate model configured');
    } finally {
      FAMILY_REGISTRY['flux'] = original;
    }
  });

  it('filters out missing schemas in getUserConfigurableFields', () => {
    const def = makeDefinitionWithFields([], ['seed', 'missing'], { seed: { type: 'integer' } });
    const fields = getUserConfigurableFields(def);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('seed');
  });

  it('rejects boolean for integer field', () => {
    const def = makeDefinitionWithFields([], ['seed'], { seed: { type: 'integer' } });
    const result = validateUserOption(def, 'seed', true);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('must be an integer');
  });

  it('coerces valid number string for number field', () => {
    const def = makeDefinitionWithFields([], ['strength'], { strength: { type: 'number' } });
    const result = validateUserOption(def, 'strength', '1.5');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe(1.5);
  });

  it('accepts raw number for number field', () => {
    const def = makeDefinitionWithFields([], ['strength'], { strength: { type: 'number' } });
    const result = validateUserOption(def, 'strength', 1.5);
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe(1.5);
  });

  it('rejects non-string for string field', () => {
    const def = makeDefinitionWithFields([], ['output_format'], { output_format: { type: 'string' } });
    const result = validateUserOption(def, 'output_format', 42);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('must be a string');
  });

  it('passes through unknown field type to enum/min/max checks', () => {
    const def = makeDefinitionWithFields([], ['output_format'], { output_format: { type: 'array' } });
    const result = validateUserOption(def, 'output_format', 'png');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe('png');
  });
});

describe('getSupportedAspectRatios', () => {
  it('returns enum for aspect_ratio mode models', () => {
    const fluxDef = DEFINITIONS_BY_MODEL_ID['black-forest-labs/flux-schnell']!;
    const ratios = getSupportedAspectRatios(fluxDef);
    expect(ratios).toContain('1:1');
    expect(ratios).toContain('16:9');
    expect(ratios).toContain('21:9');
    expect(ratios).toContain('4:5');
  });

  it('returns all dimension map keys for dimensions mode models', () => {
    const sdxlDef = DEFINITIONS_BY_MODEL_ID['stability-ai/sdxl']!;
    const ratios = getSupportedAspectRatios(sdxlDef);
    expect(ratios).toEqual(Object.keys(ASPECT_RATIO_DIMENSIONS));
  });

  it('returns all dimension map keys for custom_dimensions mode models', () => {
    const flux2Def = DEFINITIONS_BY_MODEL_ID['black-forest-labs/flux-2-pro']!;
    const ratios = getSupportedAspectRatios(flux2Def);
    expect(ratios).toEqual(Object.keys(ASPECT_RATIO_DIMENSIONS));
  });
});

describe('validateAspectRatio', () => {
  it('passes for supported ratio on aspect_ratio model', () => {
    const fluxDef = DEFINITIONS_BY_MODEL_ID['black-forest-labs/flux-schnell']!;
    const result = validateAspectRatio(fluxDef, '21:9');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('fails for unsupported ratio on aspect_ratio model', () => {
    const seedreamDef = DEFINITIONS_BY_MODEL_ID['bytedance/seedream-4']!;
    const result = validateAspectRatio(seedreamDef, '21:9');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('21:9');
    expect(result.error).toContain('seedream-4');
    expect(result.error).toContain('1:1, 16:9, 9:16');
  });

  it('passes for any ratio in dimension map on dimensions model', () => {
    const sdxlDef = DEFINITIONS_BY_MODEL_ID['stability-ai/sdxl']!;
    for (const ratio of Object.keys(ASPECT_RATIO_DIMENSIONS)) {
      const result = validateAspectRatio(sdxlDef, ratio);
      expect(result.valid).toBe(true);
    }
  });

  it('fails for unknown ratio on dimensions model', () => {
    const sdxlDef = DEFINITIONS_BY_MODEL_ID['stability-ai/sdxl']!;
    const result = validateAspectRatio(sdxlDef, '5:7');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5:7');
  });
});

describe('resolveDimensions', () => {
  it('returns base dimensions at scale 1.0', () => {
    const dims = resolveDimensions('1:1', 1.0);
    expect(dims).toEqual({ width: 1024, height: 1024 });
  });

  it('scales dimensions and rounds to multiples of 64', () => {
    const dims = resolveDimensions('1:1', 2.0);
    expect(dims.width).toBe(2048);
    expect(dims.height).toBe(2048);
    expect(dims.width % 64).toBe(0);
    expect(dims.height % 64).toBe(0);
  });

  it('scales non-square dimensions correctly', () => {
    const dims = resolveDimensions('16:9', Math.SQRT2);
    expect(dims.width % 64).toBe(0);
    expect(dims.height % 64).toBe(0);
    // Should be approximately 1.41x the base
    expect(dims.width).toBeGreaterThan(1344);
    expect(dims.height).toBeGreaterThan(768);
  });

  it('falls back to 1:1 for unknown ratio', () => {
    const dims = resolveDimensions('unknown');
    expect(dims).toEqual({ width: 1024, height: 1024 });
  });
});

describe('getResolutionScale', () => {
  it('returns 1.0 when no resolution fields exist', () => {
    const def = makeDefinitionWithFields(['width', 'height'], [], {});
    expect(getResolutionScale(def, {})).toBe(1.0);
  });

  it('derives scale from megapixels field', () => {
    const def = makeDefinitionWithFields(['aspect_ratio'], ['megapixels'], {
      megapixels: { type: 'string', default: '1' },
    });
    expect(getResolutionScale(def, { megapixels: '4' })).toBe(2.0);
    expect(getResolutionScale(def, { megapixels: '1' })).toBe(1.0);
    expect(getResolutionScale(def, { megapixels: 2 })).toBeCloseTo(Math.SQRT2, 5);
  });

  it('derives scale from size field', () => {
    const def = makeDefinitionWithFields(['aspect_ratio'], ['size'], {
      size: { type: 'string', default: '2K', enum: ['1K', '2K', '4K'] },
    });
    expect(getResolutionScale(def, { size: '1K' })).toBe(1.0);
    expect(getResolutionScale(def, { size: '2K' })).toBeCloseTo(Math.SQRT2, 5);
    expect(getResolutionScale(def, { size: '4K' })).toBe(2.0);
  });

  it('derives scale from resolution field', () => {
    const def = makeDefinitionWithFields(['aspect_ratio'], ['resolution'], {
      resolution: { type: 'string', default: '2K' },
    });
    expect(getResolutionScale(def, { resolution: '4K' })).toBe(2.0);
  });

  it('derives scale from image_size field', () => {
    const def = makeDefinitionWithFields(['aspect_ratio'], ['image_size'], {
      image_size: { type: 'string', default: 'optimize_for_quality' },
    });
    expect(getResolutionScale(def, { image_size: '1024' })).toBe(1.0);
    expect(getResolutionScale(def, { image_size: '2048' })).toBe(2.0);
    expect(getResolutionScale(def, { image_size: 'optimize_for_quality' })).toBe(1.0);
  });
});
