import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import type { ModelId } from '../src/types.js';

const mockReadGlobalConfig = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCallOpenRouterFull = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCallOpenRouter = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGenerateImage = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.unstable_mockModule('../src/core/config.js', () => ({
  readGlobalConfig: mockReadGlobalConfig,
}));

jest.unstable_mockModule('../src/core/openrouter.js', () => ({
  callOpenRouterFull: mockCallOpenRouterFull,
  callOpenRouter: mockCallOpenRouter,
  setCallOpenRouter: jest.fn(),
  resetClient: jest.fn(),
}));

jest.unstable_mockModule('../src/core/imageGeneration.js', () => ({
  generateImage: mockGenerateImage,
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let Limn: typeof import('../src/index.js').Limn;
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let limnGenerate: typeof import('../src/index.js').limnGenerate;

beforeAll(async () => {
  jest.resetModules();
  const mod = await import('../src/index.js');
  Limn = mod.Limn;
  limnGenerate = mod.limnGenerate;
});

describe('Limn class', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadGlobalConfig.mockResolvedValue({});
  });

  describe('constructor', () => {
    it('creates with empty options', () => {
      const limn = new Limn();
      expect(limn).toBeDefined();
    });

    it('creates with options', () => {
      const limn = new Limn({ openrouterApiKey: 'k1', replicateApiKey: 'k2', openrouterModel: 'm1' });
      expect(limn).toBeDefined();
    });
  });

  describe('transform', () => {
    it('delegates and returns result', async () => {
      mockCallOpenRouter.mockResolvedValue('A cat in space');
      const limn = new Limn({ openrouterApiKey: 'k' });
      const result = await limn.transform('a cat', 'flux');
      expect(result.model).toBe('flux');
      expect(result.prompt).toBe('A cat in space');
    });

    it('throws for unknown model', async () => {
      const limn = new Limn();
      await expect(limn.transform('a cat', 'unknown-model' as ModelId)).rejects.toThrow('Unknown model');
    });
  });

  describe('generate', () => {
    it('generates image with default options', async () => {
      mockCallOpenRouterFull.mockResolvedValue({
        text: 'prompt',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: 0.001, generationId: 'g1' },
        durationMs: 100,
      });
      mockGenerateImage.mockResolvedValue({
        buffer: Buffer.from('img'),
        filename: 'test.png',
        savedPath: '/tmp/test.png',
        mimeType: 'image/png',
        modelSlug: 'black-forest-labs/flux-schnell',
        replicatePredictionId: 'p1',
        replicateDurationMs: 200,
        definition: {
          modelId: 'test/model',
          provider: 'test',
          displayName: 'Test',
          category: 'image',
          pricing: { usdPerSecond: null, usdPer1kInputTokens: null, usdPer1kOutputTokens: null },
          pricingRules: { basis: 'output_image_count', usdPerImage: 0.003 },
          inputOptions: { userConfigurable: [], pipelineManaged: ['aspect_ratio'], fields: {} },
        },
        inputSentToModel: {},
      });

      const limn = new Limn({ replicateApiKey: 'rep' });
      const result = await limn.generate('a cat', 'flux');
      expect(result.promptUsed).toBe('prompt');
      expect(result.analytics.costSource).toBe('actual+estimate');
    });

    it('passes custom options to generation', async () => {
      mockCallOpenRouterFull.mockResolvedValue({
        text: 'prompt',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: null, generationId: null },
        durationMs: 100,
      });
      mockGenerateImage.mockResolvedValue({
        buffer: Buffer.from('img'),
        filename: 'test.png',
        savedPath: '/tmp/test.png',
        mimeType: 'image/png',
        modelSlug: 'black-forest-labs/flux-2-pro',
        replicatePredictionId: 'p1',
        replicateDurationMs: 200,
        definition: undefined,
        inputSentToModel: {},
      });

      const limn = new Limn({ replicateApiKey: 'rep' });
      const result = await limn.generate('a cat', 'flux', {
        replicateModel: 'black-forest-labs/flux-2-pro',
        aspectRatio: '16:9',
        options: { seed: 42 },
      });
      expect(result.promptUsed).toBe('prompt');
      expect(mockGenerateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          family: 'flux',
          replicateModelOverride: 'black-forest-labs/flux-2-pro',
          aspectRatio: '16:9',
          options: { seed: 42 },
        }),
      );
    });

    it('throws for unknown model', async () => {
      const limn = new Limn();
      await expect(limn.generate('a cat', 'unknown-model' as ModelId)).rejects.toThrow('Unknown model');
    });
  });
});

describe('limnGenerate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadGlobalConfig.mockResolvedValue({});
  });

  it('should generate successfully', async () => {
    mockCallOpenRouterFull.mockResolvedValue({
      text: 'transformed',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: null, generationId: null },
      durationMs: 100,
    });
    mockGenerateImage.mockResolvedValue({
      buffer: Buffer.from('img'),
      filename: 'test.png',
      savedPath: '/tmp/test.png',
      mimeType: 'image/png',
      modelSlug: 'black-forest-labs/flux-schnell',
      replicatePredictionId: 'p1',
      replicateDurationMs: 200,
      definition: {
        modelId: 'test/model',
        provider: 'test',
        displayName: 'Test',
        category: 'image',
        pricing: { usdPerSecond: null, usdPer1kInputTokens: null, usdPer1kOutputTokens: null },
        pricingRules: { basis: 'output_image_count', usdPerImage: 0.003 },
        inputOptions: { userConfigurable: [], pipelineManaged: ['aspect_ratio'], fields: {} },
      },
      inputSentToModel: {},
    });

    const result = await limnGenerate('a cat', 'flux', { replicateApiKey: 'rep' });
    expect(result.promptUsed).toBe('transformed');
    expect(result.analytics.costSource).toBe('estimate-only');
  });

  it('should extract negative prompt', async () => {
    mockCallOpenRouterFull.mockResolvedValue({
      text: 'prompt text\nnegative_prompt: low quality',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: null, generationId: null },
      durationMs: 100,
    });
    mockGenerateImage.mockResolvedValue({
      buffer: Buffer.from('img'),
      filename: 'test.png',
      savedPath: '/tmp/test.png',
      mimeType: 'image/png',
      modelSlug: 'stability-ai/sdxl',
      replicatePredictionId: 'p1',
      replicateDurationMs: 200,
      definition: undefined,
      inputSentToModel: {},
    });

    const result = await limnGenerate('a cat', 'sdxl', { replicateApiKey: 'rep' });
    expect(result.promptUsed).toBe('prompt text');
    expect(mockGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({ negativePrompt: 'low quality' }),
    );
  });

  it('should merge config from readGlobalConfig', async () => {
    mockReadGlobalConfig.mockResolvedValue({
      openrouterModel: 'base-model',
      replicateApiKey: 'base-rep',
    });
    mockCallOpenRouterFull.mockResolvedValue({
      text: 'prompt',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: null, generationId: null },
      durationMs: 100,
    });
    mockGenerateImage.mockResolvedValue({
      buffer: Buffer.from('img'),
      filename: 'test.png',
      savedPath: '/tmp/test.png',
      mimeType: 'image/png',
      modelSlug: 'black-forest-labs/flux-schnell',
      replicatePredictionId: 'p1',
      replicateDurationMs: 200,
      definition: undefined,
      inputSentToModel: {},
    });

    await limnGenerate('a cat', 'flux');
    expect(mockCallOpenRouterFull).toHaveBeenCalledWith(
      expect.any(String),
      'a cat',
      'base-model',
      expect.objectContaining({ openrouterModel: 'base-model', replicateApiKey: 'base-rep' }),
    );
  });

  it('should throw for unknown model', async () => {
    await expect(limnGenerate('a cat', 'unknown-model' as ModelId)).rejects.toThrow('Unknown model');
  });
});
