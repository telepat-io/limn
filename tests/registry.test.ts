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

  it('throws for chroma (generation disabled)', () => {
    expect(() => resolveReplicateModelId('chroma')).toThrow('transform-only');
  });
});

describe('FAMILY_REGISTRY', () => {
  it('has all expected families', () => {
    const keys = Object.keys(FAMILY_REGISTRY);
    expect(keys).toContain('flux');
    expect(keys).toContain('sdxl');
    expect(keys).toContain('chroma');
    expect(keys).toContain('qwen-image');
  });

  it('chroma has generationEnabled=false', () => {
    expect(FAMILY_REGISTRY['chroma'].generationEnabled).toBe(false);
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

  it('marks chroma as transform-only', () => {
    const chroma = getSupportedModelCatalog().find((entry) => entry.family === 'chroma');
    expect(chroma).toBeDefined();
    expect(chroma?.generationEnabled).toBe(false);
    expect(chroma?.replicateModelIds).toEqual([]);
    expect(chroma?.defaultReplicateModelId).toBeNull();
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
});
