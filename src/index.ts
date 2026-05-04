import { transform } from './transform/index.js';
import { profiles } from './profiles/index.js';
import type { ModelId, TransformedResult } from './types.js';

export async function limn(
  prompt: string,
  model: ModelId,
): Promise<TransformedResult> {
  const profile = profiles[model];
  if (!profile) throw new Error(`Unknown model: ${model}`);
  return transform(prompt, model);
}

export { profiles } from './profiles/index.js';
export type { ModelId, ModelProfile, TransformedResult, OutputFormat } from './types.js';
export { VALID_MODELS } from './types.js';