import fs from 'fs/promises';
import path from 'path';
import Replicate from 'replicate';
import type { GlobalConfig } from '../types.js';
import { readGlobalConfig } from './config.js';
import {
  resolveReplicateModelId,
  getGenerationInputMode,
  ASPECT_RATIO_DIMENSIONS,
  DEFINITIONS_BY_MODEL_ID,
  validateUserOption,
  type ModelDefinition,
} from '../models/registry.js';
import type { ModelId } from '../types.js';

export interface ImageGenerationOptions {
  family: ModelId;
  prompt: string;
  negativePrompt?: string;
  replicateModelOverride?: string;
  aspectRatio?: string;
  config?: GlobalConfig;
  options?: Record<string, unknown>;
}

export interface ImageGenerationResult {
  buffer: Buffer;
  filename: string;
  savedPath: string;
  mimeType: string;
  extension: string;
  replicatePredictionId: string;
  replicateDurationMs: number;
  modelSlug: string;
  definition: ModelDefinition | undefined;
  inputSentToModel: Record<string, unknown>;
}

const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

function inferMimeAndExt(url: string, defaultExt: string = 'jpg'): { mimeType: string; extension: string } {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).replace('.', '').toLowerCase();
    if (ext && EXT_TO_MIME[ext]) {
      return { mimeType: EXT_TO_MIME[ext]!, extension: ext };
    }
  } catch {
    // ignore
  }
  return { mimeType: EXT_TO_MIME[defaultExt] ?? 'image/jpeg', extension: defaultExt };
}

export function buildGenerationInput(
  definition: ModelDefinition | undefined,
  prompt: string,
  negativePrompt: string | undefined,
  aspectRatio: string,
  configDefaults?: Record<string, unknown>,
  userOptions?: Record<string, unknown>,
): Record<string, unknown> {
  if (!definition) {
    return { prompt, aspect_ratio: aspectRatio, ...userOptions };
  }

  const mode = getGenerationInputMode(definition);
  const input: Record<string, unknown> = { prompt };

  if (mode === 'aspect_ratio') {
    input['aspect_ratio'] = aspectRatio;
  } else if (mode === 'dimensions') {
    const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio] ?? ASPECT_RATIO_DIMENSIONS['1:1']!;
    input['width'] = dims.width;
    input['height'] = dims.height;
  } else {
    // custom_dimensions (flux-2-pro style)
    input['aspect_ratio'] = 'custom';
    const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio] ?? ASPECT_RATIO_DIMENSIONS['1:1']!;
    input['width'] = dims.width;
    input['height'] = dims.height;
  }

  // Pass negative prompt if the model's fields include it
  if (negativePrompt && definition.inputOptions.fields['negative_prompt']) {
    input['negative_prompt'] = negativePrompt;
  }

  // Apply schema defaults for user-configurable fields
  for (const key of definition.inputOptions.userConfigurable) {
    const field = definition.inputOptions.fields[key];
    if (field && field.default !== undefined && !(key in input)) {
      input[key] = field.default;
    }
  }

  // Merge config defaults (deep merge: top-level keys)
  const mergedOptions: Record<string, unknown> = { ...input };
  if (configDefaults) {
    for (const [key, value] of Object.entries(configDefaults)) {
      const result = validateUserOption(definition, key, value);
      if (result.valid) {
        mergedOptions[key] = result.coerced;
      }
      // Silently skip invalid config defaults to avoid crashing on startup
    }
  }

  // Merge runtime user options (CLI/API overrides)
  if (userOptions) {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(userOptions)) {
      const result = validateUserOption(definition, key, value);
      if (result.valid) {
        mergedOptions[key] = result.coerced;
      } else {
        errors.push(result.error!.reason);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Invalid generation options:\n${errors.join('\n')}`);
    }
  }

  return mergedOptions;
}

async function downloadOutputToBuffer(output: unknown): Promise<{ buffer: Buffer; url: string }> {
  // Handle FileOutput object (Replicate SDK returns these)
  if (output !== null && typeof output === 'object' && 'url' in output && typeof (output as { url: unknown }).url === 'function') {
    const fileOutput = output as { url: () => string; blob: () => Promise<Blob> };
    const url = fileOutput.url();
    const blob = await fileOutput.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return { buffer, url };
  }

  // Handle plain URL string
  if (typeof output === 'string' && (output.startsWith('http://') || output.startsWith('https://'))) {
    const resp = await fetch(output);
    if (!resp.ok) {
      throw new Error(`Failed to download image: ${resp.status} ${resp.statusText}`);
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    return { buffer, url: output };
  }

  throw new Error(`Unexpected output type from Replicate: ${typeof output}`);
}

function generateFilename(modelSlug: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  const slugPart = modelSlug.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
  return `limn_${slugPart}_${timestamp}.${extension}`;
}

export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const config = options.config ?? await readGlobalConfig();

  const replicateApiKey = config.replicateApiKey;
  if (!replicateApiKey) {
    throw new Error(
      'No Replicate API key configured.\n' +
      'Get one at https://replicate.com/account/api-tokens\n' +
      'Then run: limn settings set replicateApiKey <your-key>\n' +
      'Or set the REPLICATE_API_TOKEN environment variable.',
    );
  }

  const modelSlug = resolveReplicateModelId(options.family, options.replicateModelOverride);
  const definition = DEFINITIONS_BY_MODEL_ID[modelSlug];
  const aspectRatio = options.aspectRatio ?? '1:1';

  const configDefaults = config.modelOptions?.[options.family];
  const input = buildGenerationInput(definition, options.prompt, options.negativePrompt, aspectRatio, configDefaults, options.options);

  const replicate = new Replicate({ auth: replicateApiKey });

  // Use predictions.create + wait to get full prediction object (id, metrics)
  const startMs = Date.now();
  let prediction = await replicate.predictions.create({
    model: modelSlug,
    input,
  });
  prediction = await replicate.wait(prediction);

  if (prediction.error) {
    throw new Error(`Replicate prediction failed: ${String(prediction.error)}`);
  }

  const durationMs = prediction.metrics?.predict_time != null
    ? Math.round((prediction.metrics.predict_time as number) * 1000)
    : Date.now() - startMs;

  const rawOutput = prediction.output;

  // Output can be a single FileOutput or an array
  const firstOutput = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
  if (!firstOutput) {
    throw new Error('Replicate prediction returned no output.');
  }

  const { buffer, url } = await downloadOutputToBuffer(firstOutput);
  const defaultExt = (definition?.inputOptions.fields['output_format']?.default as string | undefined) ?? 'jpg';
  const { mimeType, extension } = inferMimeAndExt(url, defaultExt);

  const filename = generateFilename(modelSlug, extension);
  const savedPath = path.join(process.cwd(), filename);
  await fs.writeFile(savedPath, buffer);

  return {
    buffer,
    filename,
    savedPath,
    mimeType,
    extension,
    replicatePredictionId: prediction.id,
    replicateDurationMs: durationMs,
    modelSlug,
    definition,
    inputSentToModel: input,
  };
}
