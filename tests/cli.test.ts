import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { runCli } from '../src/cli/index.js';
import { VALID_MODELS } from '../src/types.js';
import { setCallOpenRouter, type CallOpenRouterFn } from '../src/core/openrouter.js';

const mockCall = jest.fn() as unknown as CallOpenRouterFn;
const mCall = mockCall as unknown as jest.Mock;

describe('CLI', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    mCall.mockReset();
    setCallOpenRouter(mockCall);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    setCallOpenRouter(null);
  });

  it('should output plain text by default', async () => {
    mCall.mockResolvedValueOnce('A fluffy cat floating in space' as never);

    await runCli(['-m', 'flux', 'a cat in space']);
    expect(logSpy).toHaveBeenCalledWith('A fluffy cat floating in space');
  });

  it('should output JSON when --json flag is passed', async () => {
    mCall.mockResolvedValueOnce('A fluffy cat floating in space' as never);

    await runCli(['-m', 'flux', '--json', 'a cat in space']);
    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.model).toBe('flux');
    expect(parsed.prompt).toBe('A fluffy cat floating in space');
  });

  it('should output negative prompt for models that support it', async () => {
    mCall.mockResolvedValueOnce('cat in space\nnegative_prompt: blurry, low quality' as never);

    await runCli(['-m', 'sdxl', 'a cat in space']);
    expect(logSpy).toHaveBeenCalledWith('cat in space');
    expect(logSpy).toHaveBeenCalledWith('\nnegative_prompt: blurry, low quality');
  });

  it('should handle errors gracefully', async () => {
    mCall.mockRejectedValueOnce(new Error('API error') as never);

    await runCli(['-m', 'flux', 'a cat in space']);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should accept all valid models', () => {
    for (const model of VALID_MODELS) {
      expect(VALID_MODELS.includes(model as typeof VALID_MODELS[number])).toBe(true);
    }
  });
});