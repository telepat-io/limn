import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { limn } from '../src/index.js';
import { profiles } from '../src/profiles/index.js';
import { VALID_MODELS, type ModelId } from '../src/types.js';
import { setCallOpenRouter, type CallOpenRouterFn } from '../src/core/openrouter.js';

const mockCall = jest.fn() as unknown as CallOpenRouterFn;
const mCall = mockCall as unknown as jest.Mock;

describe('limn library API', () => {
  beforeEach(() => {
    mCall.mockReset();
    setCallOpenRouter(mockCall);
  });

  afterEach(() => {
    setCallOpenRouter(null);
  });

  it('should throw for unknown model', async () => {
    await expect(limn('a cat', 'unknown-model' as ModelId)).rejects.toThrow('Unknown model');
  });

  it('should return transformed result for a valid model', async () => {
    mCall.mockResolvedValueOnce('masterpiece, best quality, (fluffy orange tabby cat:1.3), floating in outer space' as never);

    const result = await limn('a cat in space', 'flux');
    expect(result.model).toBe('flux');
    expect(result.prompt).toBe('masterpiece, best quality, (fluffy orange tabby cat:1.3), floating in outer space');
    expect(result.negativePrompt).toBeUndefined();
  });

  it('should return negative prompt for models that support it', async () => {
    const sdxlOutput = 'masterpiece, best quality, cat in space\nnegative_prompt: low quality, blurry, distorted';
    mCall.mockResolvedValueOnce(sdxlOutput as never);

    const result = await limn('a cat in space', 'sdxl');
    expect(result.model).toBe('sdxl');
    expect(result.prompt).toContain('masterpiece');
    expect(result.negativePrompt).toContain('low quality');
  });

  it('should not parse negative prompt for models that do not support it', async () => {
    const fluxOutput = 'A fluffy orange tabby cat floating in outer space with a cosmic nebula background';
    mCall.mockResolvedValueOnce(fluxOutput as never);

    const result = await limn('a cat in space', 'flux');
    expect(result.negativePrompt).toBeUndefined();
  });

  it('should throw if callOpenRouter rejects', async () => {
    mCall.mockRejectedValueOnce(new Error('No OpenRouter API key configured') as never);

    await expect(limn('a cat in space', 'flux')).rejects.toThrow('No OpenRouter API key configured');
  });

  it('should export all 8 profiles', () => {
    expect(Object.keys(profiles)).toHaveLength(8);
    for (const modelId of VALID_MODELS) {
      expect(profiles[modelId as ModelId]).toBeDefined();
      expect(profiles[modelId as ModelId].id).toBe(modelId);
    }
  });
});