import { describe, it, expect } from '@jest/globals';
import { buildGuideMarkdown } from '../scripts/build-guide.js';
import { profiles } from '../src/profiles/index.js';
import { VALID_MODELS } from '../src/types.js';
import type { ModelId, ModelProfile } from '../src/types.js';

describe('buildGuideMarkdown', () => {
  const guide = buildGuideMarkdown(profiles);

  it('should produce a non-empty string', () => {
    expect(guide).toBeTruthy();
    expect(guide.length).toBeGreaterThan(1000);
  });

  it('should include the title', () => {
    expect(guide).toContain('# T2I Model Prompting Knowledge Base');
  });

  it('should include all four major sections', () => {
    expect(guide).toContain('## 1. Architectural Foundations');
    expect(guide).toContain('## 2. Per-Model Prompting Guides');
    expect(guide).toContain('## 3. Cross-Model Strategies');
    expect(guide).toContain('## 4. Reference Tables');
  });

  it('should list every model', () => {
    for (const modelId of VALID_MODELS) {
      expect(guide).toContain(profiles[modelId as ModelId].name);
      expect(guide).toContain(modelId);
    }
  });

  it('should include personas for every model', () => {
    for (const modelId of VALID_MODELS) {
      expect(guide).toContain(profiles[modelId as ModelId].persona);
    }
  });

  it('should include output format info', () => {
    for (const modelId of VALID_MODELS) {
      expect(guide).toContain(profiles[modelId as ModelId].outputFormat);
    }
  });

  it('should indicate negative prompt support correctly', () => {
    expect(guide).toContain('Supported');
    expect(guide).toContain('Not supported');
  });

  it('should include the comparison cheat sheet', () => {
    expect(guide).toContain('### Model Comparison Cheat Sheet');
    expect(guide).toContain('| Model | Format | Negative Prompt | Style |');
  });

  it('should include anti-patterns section for models that have them', () => {
    expect(guide).toContain('**Anti-patterns:**');
  });

  it('should include the cross-model strategies', () => {
    expect(guide).toContain('Text Rendering vs. Text Prevention');
    expect(guide).toContain('Affirmative Framing');
    expect(guide).toContain('Weighting Syntax Comparison');
    expect(guide).toContain('Persona Strategies');
  });

  it('should handle empty profiles gracefully', () => {
    const result = buildGuideMarkdown({} as Record<string, ModelProfile>);
    expect(result).toBeTruthy();
    expect(result).not.toContain('### 2.');
  });

  it('should include a single profile correctly', () => {
    const singleGuide = buildGuideMarkdown({
      test: {
        id: 'test',
        name: 'Test Model',
        outputFormat: 'prose',
        supportsNegativePrompt: false,
        persona: 'tester',
        systemPrompt: 'You are a testing model.',
        avoidPatterns: ['do not test carelessly'],
      },
    });

    expect(singleGuide).toContain('Test Model');
    expect(singleGuide).toContain('tester');
    expect(singleGuide).toContain('You are a testing model.');
    expect(singleGuide).toContain('do not test carelessly');
    expect(singleGuide).toContain('prose');
  });
});