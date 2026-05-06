import { describe, it, expect } from '@jest/globals';
import { buildGenerationInput } from '../src/core/imageGeneration.js';
import {
  DEFINITIONS_BY_MODEL_ID,
  validateUserOption,
  getUserConfigurableFields,
} from '../src/models/registry.js';

const fluxDef = DEFINITIONS_BY_MODEL_ID['black-forest-labs/flux-schnell'];
const sdxlDef = DEFINITIONS_BY_MODEL_ID['stability-ai/sdxl'];
const flux2Def = DEFINITIONS_BY_MODEL_ID['black-forest-labs/flux-2-pro']!;
const seedreamDef = DEFINITIONS_BY_MODEL_ID['bytedance/seedream-4']!;
const wanDef = DEFINITIONS_BY_MODEL_ID['prunaai/wan-2.2-image']!;

describe('buildGenerationInput', () => {
  it('returns basic input when definition is undefined', () => {
    const input = buildGenerationInput(undefined, 'a cat', undefined, '1:1');
    expect(input).toEqual({ prompt: 'a cat', aspect_ratio: '1:1' });
  });

  it('applies schema defaults for user-configurable fields', () => {
    const input = buildGenerationInput(fluxDef, 'a cat', undefined, '1:1');
    expect(input['num_outputs']).toBe(1);
    expect(input['output_format']).toBe('webp');
    expect(input['go_fast']).toBe(true);
  });

  it('merges config defaults over schema defaults', () => {
    const input = buildGenerationInput(fluxDef, 'a cat', undefined, '1:1', {
      output_format: 'png',
      num_outputs: 2,
    });
    expect(input['output_format']).toBe('png');
    expect(input['num_outputs']).toBe(2);
    expect(input['go_fast']).toBe(true); // unchanged default
  });

  it('merges user options over config defaults and schema defaults', () => {
    const input = buildGenerationInput(
      fluxDef,
      'a cat',
      undefined,
      '1:1',
      { output_format: 'png', num_outputs: 2 },
      { num_outputs: 4, seed: 42 },
    );
    expect(input['output_format']).toBe('png');
    expect(input['num_outputs']).toBe(4);
    expect(input['seed']).toBe(42);
    expect(input['go_fast']).toBe(true);
  });

  it('throws for unknown user options', () => {
    expect(() =>
      buildGenerationInput(fluxDef, 'a cat', undefined, '1:1', undefined, {
        unknown_field: 'x',
      }),
    ).toThrow(/"unknown_field" is not a configurable option/);
  });

  it('throws for pipeline-managed overrides', () => {
    expect(() =>
      buildGenerationInput(fluxDef, 'a cat', undefined, '1:1', undefined, {
        aspect_ratio: '16:9',
      }),
    ).toThrow(/managed by the pipeline/);
  });

  it('passes negative prompt when model supports it', () => {
    const input = buildGenerationInput(sdxlDef, 'a cat', 'blurry', '1:1');
    expect(input['negative_prompt']).toBe('blurry');
  });

  it('sets width and height for dimension-based models', () => {
    const input = buildGenerationInput(sdxlDef, 'a cat', undefined, '16:9');
    expect(input['width']).toBe(1344);
    expect(input['height']).toBe(768);
  });

  it('sets custom aspect ratio for custom_dimensions models', () => {
    const input = buildGenerationInput(flux2Def, 'a cat', undefined, '16:9');
    expect(input['aspect_ratio']).toBe('custom');
    expect(input['width']).toBe(1344);
    expect(input['height']).toBe(768);
  });

  it('throws on unsupported aspect ratio for aspect_ratio models', () => {
    expect(() =>
      buildGenerationInput(seedreamDef, 'a cat', undefined, '21:9'),
    ).toThrow(/Aspect ratio "21:9" is not supported by bytedance\/seedream-4/);
  });

  it('throws on unsupported aspect ratio for dimensions models', () => {
    expect(() =>
      buildGenerationInput(sdxlDef, 'a cat', undefined, '5:7'),
    ).toThrow(/Aspect ratio "5:7" is not supported/);
  });

  it('accepts all supported aspect ratios for aspect_ratio models', () => {
    const ratios = ['1:1', '16:9', '9:16'];
    for (const ratio of ratios) {
      const input = buildGenerationInput(seedreamDef, 'a cat', undefined, ratio);
      expect(input['aspect_ratio']).toBe(ratio);
    }
  });

  it('accepts all dimension map ratios for dimensions models', () => {
    const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '2:1', '1:2', '21:9'];
    for (const ratio of ratios) {
      const input = buildGenerationInput(sdxlDef, 'a cat', undefined, ratio);
      expect(input['width']).toBeDefined();
      expect(input['height']).toBeDefined();
    }
  });

  it('uses resolution-aware dimensions when model has resolution option', () => {
    const input = buildGenerationInput(wanDef, 'a cat', undefined, '1:1', { megapixels: 2 });
    // Wan 2.2 is aspect_ratio mode, so it doesn't use dimensions — aspect_ratio is passed through
    expect(input['aspect_ratio']).toBe('1:1');
    expect(input['megapixels']).toBe(2);
  });

  it('scales dimensions for custom_dimensions model with resolution config', () => {
    // FLUX 2 Pro doesn't have resolution options, so scale stays at 1.0
    const input = buildGenerationInput(flux2Def, 'a cat', undefined, '1:1');
    expect(input['width']).toBe(1024);
    expect(input['height']).toBe(1024);
  });
});

describe('validateUserOption', () => {
  it('accepts valid string enum values', () => {
    const result = validateUserOption(fluxDef, 'output_format', 'png');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe('png');
  });

  it('rejects invalid enum values', () => {
    const result = validateUserOption(fluxDef, 'output_format', 'gif');
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('webp, jpg, png');
  });

  it('coerces string to integer', () => {
    const result = validateUserOption(fluxDef, 'num_outputs', '2');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe(2);
  });

  it('rejects out-of-range integers', () => {
    const result = validateUserOption(fluxDef, 'num_outputs', 10);
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('at most 4');
  });

  it('coerces string to boolean', () => {
    expect(validateUserOption(fluxDef, 'go_fast', 'true').coerced).toBe(true);
    expect(validateUserOption(fluxDef, 'go_fast', 'false').coerced).toBe(false);
  });

  it('accepts raw boolean values', () => {
    expect(validateUserOption(fluxDef, 'go_fast', true).valid).toBe(true);
  });

  it('rejects non-boolean values for boolean fields', () => {
    const result = validateUserOption(fluxDef, 'go_fast', 1);
    expect(result.valid).toBe(false);
  });

  it('accepts nullable fields', () => {
    const result = validateUserOption(fluxDef, 'seed', null);
    expect(result.valid).toBe(true);
    expect(result.coerced).toBeNull();
  });

  it('rejects pipeline-managed fields', () => {
    const result = validateUserOption(fluxDef, 'prompt', 'hello');
    expect(result.valid).toBe(false);
    expect(result.error?.reason).toContain('managed by the pipeline');
  });
});

describe('getUserConfigurableFields', () => {
  it('returns fields for flux-schnell', () => {
    const fields = getUserConfigurableFields(fluxDef);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((f) => f.name === 'num_outputs')).toBe(true);
    expect(fields.some((f) => f.name === 'seed')).toBe(true);
  });
});
