import { describe, it, expect, jest, beforeEach, beforeAll, afterEach } from '@jest/globals';

const mockReadGlobalConfig = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockWriteFile = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPredictionsCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockWait = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.unstable_mockModule('../src/core/config.js', () => ({
  readGlobalConfig: mockReadGlobalConfig,
}));

jest.unstable_mockModule('fs/promises', () => ({
  default: { writeFile: mockWriteFile },
}));

const MockReplicate = jest.fn().mockImplementation(() => ({
  predictions: { create: mockPredictionsCreate },
  wait: mockWait,
}));

jest.unstable_mockModule('replicate', () => ({
  __esModule: true,
  default: MockReplicate,
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let generateImage: typeof import('../src/core/imageGeneration.js').generateImage;

beforeAll(async () => {
  jest.resetModules();
  const mod = await import('../src/core/imageGeneration.js');
  generateImage = mod.generateImage;
});

describe('generateImage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadGlobalConfig.mockResolvedValue({});
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws when no replicate API key is available', async () => {
    mockReadGlobalConfig.mockResolvedValue({});
    await expect(generateImage({ family: 'flux', prompt: 'a cat' })).rejects.toThrow('No Replicate API key');
  });

  it('generates image with URL string output', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-1' });
    mockWait.mockResolvedValue({
      id: 'pred-1',
      error: null,
      metrics: { predict_time: 1.5 },
      output: 'https://example.com/image.png',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(3),
    });

    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.buffer).toEqual(Buffer.from(new ArrayBuffer(3)));
    expect(result.mimeType).toBe('image/png');
    expect(result.filename).toMatch(/^limn_.*\.png$/);
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('generates image with FileOutput object', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-2' });
    const blob = new Blob(['img']);
    mockWait.mockResolvedValue({
      id: 'pred-2',
      error: null,
      metrics: { predict_time: 2.0 },
      output: {
        url: () => 'https://example.com/image.jpg',
        blob: async () => blob,
      },
    });

    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.buffer).toEqual(Buffer.from(await blob.arrayBuffer()));
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('generates image with array output', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-3' });
    mockWait.mockResolvedValue({
      id: 'pred-3',
      error: null,
      metrics: { predict_time: 0.5 },
      output: ['https://example.com/image.webp'],
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    });

    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.mimeType).toBe('image/webp');
  });

  it('falls back to default extension when URL has none', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-4' });
    mockWait.mockResolvedValue({
      id: 'pred-4',
      error: null,
      metrics: {},
      output: 'https://example.com/image',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(5),
    });

    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.extension).toBe('webp');
    expect(result.mimeType).toBe('image/webp');
  });

  it('falls back to default extension for unknown mime type', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-14' });
    mockWait.mockResolvedValue({
      id: 'pred-14',
      error: null,
      metrics: {},
      output: 'https://example.com/image.bmp',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(3),
    });

    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('webp');
  });

  it('falls back to default extension on invalid URL', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-11' });
    mockWait.mockResolvedValue({
      id: 'pred-11',
      error: null,
      metrics: {},
      output: {
        url: () => 'not-a-url',
        blob: async () => new Blob(['img']),
      },
    });

    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('webp');
  });

  it('throws on Replicate prediction error', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-5' });
    mockWait.mockResolvedValue({
      id: 'pred-5',
      error: 'Something went wrong',
    });

    await expect(generateImage({ family: 'flux', prompt: 'a cat' })).rejects.toThrow('Replicate prediction failed');
  });

  it('throws when output is empty array', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-6' });
    mockWait.mockResolvedValue({
      id: 'pred-6',
      error: null,
      output: [],
    });

    await expect(generateImage({ family: 'flux', prompt: 'a cat' })).rejects.toThrow('no output');
  });

  it('throws when output is null', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-7' });
    mockWait.mockResolvedValue({
      id: 'pred-7',
      error: null,
      output: null,
    });

    await expect(generateImage({ family: 'flux', prompt: 'a cat' })).rejects.toThrow('no output');
  });

  it('throws on failed download', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-8' });
    mockWait.mockResolvedValue({
      id: 'pred-8',
      error: null,
      output: 'https://example.com/image.png',
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(generateImage({ family: 'flux', prompt: 'a cat' })).rejects.toThrow('Failed to download');
  });

  it('throws on unexpected output type', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-9' });
    mockWait.mockResolvedValue({
      id: 'pred-9',
      error: null,
      output: 123,
    });

    await expect(generateImage({ family: 'flux', prompt: 'a cat' })).rejects.toThrow('Unexpected output type');
  });

  it('uses provided config instead of reading global config', async () => {
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-12' });
    mockWait.mockResolvedValue({
      id: 'pred-12',
      error: null,
      metrics: {},
      output: 'https://example.com/image.png',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(3),
    });

    const result = await generateImage({
      family: 'flux',
      prompt: 'a cat',
      config: { replicateApiKey: 'custom-key' },
    });
    expect(result.buffer).toBeDefined();
    expect(mockReadGlobalConfig).not.toHaveBeenCalled();
  });

  it('uses version hash path for SDXL model', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-sdxl' });
    mockWait.mockResolvedValue({
      id: 'pred-sdxl',
      error: null,
      metrics: { predict_time: 1.5 },
      output: 'https://example.com/image.png',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(3),
    });

    await generateImage({ family: 'sdxl', prompt: 'a cat' });
    expect(mockPredictionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'stability-ai/sdxl',
        version: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });

  it('calculates duration from Date.now when predict_time missing', async () => {
    mockReadGlobalConfig.mockResolvedValue({ replicateApiKey: 'rep-key' });
    mockPredictionsCreate.mockResolvedValue({ id: 'pred-13' });
    mockWait.mockResolvedValue({
      id: 'pred-13',
      error: null,
      metrics: {},
      output: 'https://example.com/image.png',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(3),
    });

    const start = Date.now();
    const result = await generateImage({ family: 'flux', prompt: 'a cat' });
    expect(result.replicateDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.replicateDurationMs).toBeLessThanOrEqual(Date.now() - start + 100);
  });
});
