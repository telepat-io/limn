import { describe, it, expect } from '@jest/globals';
import { profiles } from '../src/profiles/index.js';
import { VALID_MODELS } from '../src/types.js';
import type { ModelId, OutputFormat } from '../src/types.js';

const VALID_OUTPUT_FORMATS: OutputFormat[] = [
  'prose',
  'tags',
  'camera-prose',
  'sentence',
  'reasoning',
  'cinematographic',
  'style-forward',
  'natural',
];

describe('profiles', () => {
  it('should have all 7 model profiles', () => {
    expect(Object.keys(profiles)).toHaveLength(7);
    for (const modelId of VALID_MODELS) {
      expect(profiles[modelId as ModelId]).toBeDefined();
    }
  });

  it('should have valid profile structure for each model', () => {
    for (const modelId of VALID_MODELS) {
      const profile = profiles[modelId as ModelId];
      expect(profile.id).toBe(modelId);
      expect(profile.name).toBeTruthy();
      expect(profile.persona).toBeTruthy();
      expect(profile.systemPrompt.length).toBeGreaterThan(50);
      expect(VALID_OUTPUT_FORMATS).toContain(profile.outputFormat);
      expect(typeof profile.supportsNegativePrompt).toBe('boolean');
      expect(Array.isArray(profile.avoidPatterns)).toBe(true);
    }
  });

  it('should have correct negative prompt support flags', () => {
    expect(profiles['sdxl'].supportsNegativePrompt).toBe(true);
    expect(profiles['qwen-image'].supportsNegativePrompt).toBe(true);

    expect(profiles['flux'].supportsNegativePrompt).toBe(false);
    expect(profiles['nano-banana'].supportsNegativePrompt).toBe(false);
    expect(profiles['seedream'].supportsNegativePrompt).toBe(false);
    expect(profiles['z-image'].supportsNegativePrompt).toBe(false);
    expect(profiles['wan-image'].supportsNegativePrompt).toBe(false);
  });

  it('should have correct output formats', () => {
    expect(profiles['flux'].outputFormat).toBe('prose');
    expect(profiles['sdxl'].outputFormat).toBe('tags');
    expect(profiles['z-image'].outputFormat).toBe('camera-prose');
    expect(profiles['seedream'].outputFormat).toBe('sentence');
    expect(profiles['nano-banana'].outputFormat).toBe('reasoning');
    expect(profiles['wan-image'].outputFormat).toBe('cinematographic');
    expect(profiles['qwen-image'].outputFormat).toBe('natural');
  });

  it('should have non-empty system prompts', () => {
    for (const modelId of VALID_MODELS) {
      const profile = profiles[modelId as ModelId];
      expect(profile.systemPrompt.length).toBeGreaterThan(100);
    }
  });

  it('should have non-empty avoid patterns for most models', () => {
    const withAvoidPatterns = VALID_MODELS.filter((id) => profiles[id as ModelId].avoidPatterns.length > 0);
    expect(withAvoidPatterns.length).toBe(6);
  });

  it('should encode key rules in system prompts', () => {
    expect(profiles['sdxl'].systemPrompt).toContain('77');
    expect(profiles['flux'].systemPrompt).toContain('FRONT-LOAD');
    expect(profiles['z-image'].systemPrompt).toContain('NO NEGATIVE PROMPTS');
    expect(profiles['seedream'].systemPrompt).toContain('FULL SENTENCES ONLY');
  });
});