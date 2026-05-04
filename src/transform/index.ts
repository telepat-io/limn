import { profiles } from '../profiles/index.js';
import { callOpenRouter } from '../core/openrouter.js';
import type { ModelId, TransformedResult } from '../types.js';

function buildSystemPrompt(modelId: ModelId): string {
  const profile = profiles[modelId];
  if (!profile) throw new Error(`Unknown model: ${modelId}`);
  return profile.systemPrompt;
}

export async function transform(
  userPrompt: string,
  modelId: ModelId,
): Promise<TransformedResult> {
  const profile = profiles[modelId];
  if (!profile) throw new Error(`Unknown model: ${modelId}`);

  const systemPrompt = buildSystemPrompt(modelId);
  const rawOutput = await callOpenRouter(systemPrompt, userPrompt);

  let prompt = rawOutput;
  let negativePrompt: string | undefined;

  if (profile.supportsNegativePrompt) {
    const negMatch = rawOutput.match(/negative_prompt:\s*(.+)/is);
    if (negMatch) {
      negativePrompt = negMatch[1].trim();
      prompt = rawOutput.replace(/negative_prompt:\s*.+/is, '').trim();
    }
  }

  return { model: modelId, prompt, negativePrompt };
}

export { buildSystemPrompt };