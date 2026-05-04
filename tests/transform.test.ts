import { describe, it, expect } from '@jest/globals';
import { buildSystemPrompt } from '../src/transform/index.js';
import { VALID_MODELS } from '../src/types.js';
import type { ModelId } from '../src/types.js';

describe('transform', () => {
  describe('buildSystemPrompt', () => {
    it('should return system prompt for each valid model', () => {
      for (const modelId of VALID_MODELS) {
        const prompt = buildSystemPrompt(modelId as ModelId);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(50);
      }
    });

    it('should throw for unknown model', () => {
      expect(() => buildSystemPrompt('unknown-model' as ModelId)).toThrow('Unknown model');
    });

    it('should produce flux-specific rules', () => {
      const prompt = buildSystemPrompt('flux');
      expect(prompt).toContain('FLUX');
      expect(prompt).toContain('natural language');
      expect(prompt).toContain('AFFIRMATIVE ONLY');
    });

    it('should produce sdxl-specific rules', () => {
      const prompt = buildSystemPrompt('sdxl');
      expect(prompt).toContain('SDXL');
      expect(prompt).toContain('comma');
      expect(prompt).toContain('77');
    });

    it('should produce z-image-turbo-specific rules', () => {
      const prompt = buildSystemPrompt('z-image-turbo');
      expect(prompt).toContain('Z-Image Turbo');
      expect(prompt).toContain('NO NEGATIVE PROMPTS');
      expect(prompt).toContain('75');
    });

    it('should produce seedream-4-specific rules', () => {
      const prompt = buildSystemPrompt('seedream-4');
      expect(prompt).toContain('Seedream-4');
      expect(prompt).toContain('FULL SENTENCES ONLY');
    });

    it('should produce wan-image-specific rules', () => {
      const prompt = buildSystemPrompt('wan-image');
      expect(prompt).toContain('Wan Image');
      expect(prompt).toContain('Pan Left');
      expect(prompt).toContain('Pull Back');
    });

    it('should produce chroma-specific rules', () => {
      const prompt = buildSystemPrompt('chroma');
      expect(prompt).toContain('Chroma');
      expect(prompt).toContain('STYLE-FORWARD');
    });

    it('should produce nano-banana-pro-specific rules', () => {
      const prompt = buildSystemPrompt('nano-banana-pro');
      expect(prompt).toContain('Nano Banana Pro');
      expect(prompt).toContain('5-PART STRUCTURE');
    });

    it('should produce qwen-image-specific rules', () => {
      const prompt = buildSystemPrompt('qwen-image');
      expect(prompt).toContain('Qwen Image');
      expect(prompt).toContain('QUALITY SUFFIX');
    });
  });
});