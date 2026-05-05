import { transform } from './transform/index.js';
import { profiles } from './profiles/index.js';
import { callOpenRouterFull } from './core/openrouter.js';
import { generateImage } from './core/imageGeneration.js';
import { buildAnalytics } from './core/costs.js';
import { readGlobalConfig } from './core/config.js';
import { getSupportedModelCatalog } from './models/registry.js';
import type { ModelId, TransformedResult, LimnGenerateResult, GlobalConfig } from './types.js';

export async function limn(
  prompt: string,
  model: ModelId,
): Promise<TransformedResult> {
  const profile = profiles[model];
  if (!profile) throw new Error(`Unknown model: ${model}`);
  return transform(prompt, model);
}

export interface LimnConstructorOptions {
  openrouterApiKey?: string;
  replicateApiKey?: string;
  openrouterModel?: string;
}

export interface LimnGenerateOptions {
  replicateModel?: string;
  aspectRatio?: string;
  options?: Record<string, unknown>;
}

export class Limn {
  private readonly config: GlobalConfig;

  constructor(options: LimnConstructorOptions = {}) {
    this.config = {
      openrouterApiKey: options.openrouterApiKey,
      replicateApiKey: options.replicateApiKey,
      openrouterModel: options.openrouterModel,
    };
  }

  async transform(prompt: string, model: ModelId): Promise<TransformedResult> {
    const profile = profiles[model];
    if (!profile) throw new Error(`Unknown model: ${model}`);
    return transform(prompt, model, this.config);
  }

  async generate(
    prompt: string,
    model: ModelId,
    options: LimnGenerateOptions = {},
  ): Promise<LimnGenerateResult> {
    return limnGenerate(prompt, model, {
      ...options,
      openrouterApiKey: this.config.openrouterApiKey,
      replicateApiKey: this.config.replicateApiKey,
      openrouterModel: this.config.openrouterModel,
      options: options.options,
    });
  }
}

export async function limnGenerate(
  prompt: string,
  model: ModelId,
  options: LimnGenerateOptions & {
    openrouterApiKey?: string;
    replicateApiKey?: string;
    openrouterModel?: string;
  } = {},
): Promise<LimnGenerateResult> {
  const profile = profiles[model];
  if (!profile) throw new Error(`Unknown model: ${model}`);

  const baseConfig = await readGlobalConfig();
  const config: GlobalConfig = {
    openrouterApiKey: options.openrouterApiKey ?? baseConfig.openrouterApiKey,
    replicateApiKey: options.replicateApiKey ?? baseConfig.replicateApiKey,
    openrouterModel: options.openrouterModel ?? baseConfig.openrouterModel,
  };

  const totalStartMs = Date.now();

  // Step 1: Transform prompt via OpenRouter (capture usage)
  const orResult = await callOpenRouterFull(profile.systemPrompt, prompt, config.openrouterModel, config);

  let transformedPrompt = orResult.text;
  let negativePrompt: string | undefined;

  if (profile.supportsNegativePrompt) {
    const negMatch = orResult.text.match(/negative_prompt:\s*(.+)/is);
    if (negMatch) {
      negativePrompt = negMatch[1].trim();
      transformedPrompt = orResult.text.replace(/negative_prompt:\s*.+/is, '').trim();
    }
  }

  // Step 2: Generate image via Replicate
  const imageResult = await generateImage({
    family: model,
    prompt: transformedPrompt,
    negativePrompt,
    replicateModelOverride: options.replicateModel,
    aspectRatio: options.aspectRatio,
    config,
    options: options.options,
  });

  // Step 3: Build analytics
  const analytics = buildAnalytics(
    totalStartMs,
    orResult.durationMs,
    orResult.usage,
    {
      predictionId: imageResult.replicatePredictionId,
      metrics: { predict_time: imageResult.replicateDurationMs / 1000 },
      definition: imageResult.definition,
      input: imageResult.inputSentToModel,
    },
  );

  return {
    image: imageResult.buffer,
    filename: imageResult.filename,
    savedPath: imageResult.savedPath,
    mimeType: imageResult.mimeType,
    modelSlug: imageResult.modelSlug,
    promptUsed: transformedPrompt,
    analytics,
  };
}

export { profiles } from './profiles/index.js';
export { getSupportedModelCatalog };
export type {
  ModelId,
  ModelProfile,
  TransformedResult,
  OutputFormat,
  LimnGenerateResult,
  GenerationAnalytics,
  OpenRouterUsage,
  SupportedModelCatalogEntry,
} from './types.js';
export { VALID_MODELS } from './types.js';
