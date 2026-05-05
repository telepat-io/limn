import type { ModelId, SupportedModelCatalogEntry } from '../types.js';
import { profiles } from '../profiles/index.js';

export interface ModelDefinition {
  modelId: string;
  provider: string;
  displayName: string;
  category: string;
  pricingSourceUrl?: string;
  pricingNotes?: string;
  pricing: {
    usdPerSecond: number | null;
    usdPer1kInputTokens: number | null;
    usdPer1kOutputTokens: number | null;
  };
  pricingRules?: PricingRules;
  inputOptions: {
    userConfigurable: string[];
    pipelineManaged: string[];
    fields: Record<string, FieldDefinition>;
  };
}

export type PricingRules =
  | { basis: 'output_image_count'; usdPerImage: number }
  | { basis: 'approximate_per_run'; usdPerImage: number }
  | { basis: 'output_image_resolution'; tiers: Array<{ resolution: string; usdPerImage: number }> }
  | { basis: 'output_image_megapixels'; tiers: Array<{ maxMegapixels: number; usdPerImage: number }> };

export interface FieldDefinition {
  type: string;
  default?: unknown;
  required?: boolean;
  nullable?: boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  allowAnyString?: boolean;
  recommendedValues?: string[];
}

export type GenerationInputMode =
  | 'aspect_ratio'       // model accepts aspect_ratio string
  | 'dimensions'         // model accepts width + height integers
  | 'custom_dimensions'; // model accepts aspect_ratio="custom" + width + height

export interface FamilyEntry {
  replicateModelIds: string[];
  defaultReplicateModelId: string | null;
  generationEnabled: boolean;
}

// Derive input mode from a definition's pipelineManaged array
export function getGenerationInputMode(definition: ModelDefinition): GenerationInputMode {
  const managed = definition.inputOptions.pipelineManaged;
  const hasAspectRatio = managed.includes('aspect_ratio');
  const hasDimensions = managed.includes('width') && managed.includes('height');

  if (hasAspectRatio && hasDimensions) {
    return 'custom_dimensions';
  }
  if (hasDimensions) {
    return 'dimensions';
  }
  return 'aspect_ratio';
}

// Standard aspect-ratio → dimensions mapping
export const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768,  height: 1344 },
  '4:3':  { width: 1152, height: 896 },
  '3:4':  { width: 896,  height: 1152 },
  '3:2':  { width: 1216, height: 832 },
  '2:3':  { width: 832,  height: 1216 },
  '2:1':  { width: 1408, height: 704 },
  '1:2':  { width: 704,  height: 1408 },
  '21:9': { width: 1536, height: 640 },
};

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const _dir = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

function loadDef(name: string): ModelDefinition {
  return JSON.parse(readFileSync(resolve(_dir, 'definitions', name), 'utf-8')) as ModelDefinition;
}

export const DEFINITIONS_BY_MODEL_ID: Record<string, ModelDefinition> = (() => {
  const defs: ModelDefinition[] = [
    loadDef('black-forest-labs__flux-schnell.json'),
    loadDef('black-forest-labs__flux-2-pro.json'),
    loadDef('bytedance__seedream-4.json'),
    loadDef('google__nano-banana-pro.json'),
    loadDef('prunaai__z-image-turbo.json'),
    loadDef('prunaai__wan-2.2-image.json'),
    loadDef('stability-ai__sdxl.json'),
    loadDef('qwen__qwen-image.json'),
    loadDef('qwen__qwen-image-2512.json'),
    loadDef('qwen__qwen-image-2.json'),
    loadDef('qwen__qwen-image-2-pro.json'),
  ];
  const map: Record<string, ModelDefinition> = {};
  for (const d of defs) map[d.modelId] = d;
  return map;
})();

export const FAMILY_REGISTRY: Record<ModelId, FamilyEntry> = {
  flux: {
    replicateModelIds: [
      'black-forest-labs/flux-schnell',
      'black-forest-labs/flux-2-pro',
    ],
    defaultReplicateModelId: 'black-forest-labs/flux-schnell',
    generationEnabled: true,
  },
  sdxl: {
    replicateModelIds: ['stability-ai/sdxl'],
    defaultReplicateModelId: 'stability-ai/sdxl',
    generationEnabled: true,
  },
  'nano-banana-pro': {
    replicateModelIds: ['google/nano-banana-pro'],
    defaultReplicateModelId: 'google/nano-banana-pro',
    generationEnabled: true,
  },
  'seedream-4': {
    replicateModelIds: ['bytedance/seedream-4'],
    defaultReplicateModelId: 'bytedance/seedream-4',
    generationEnabled: true,
  },
  'z-image-turbo': {
    replicateModelIds: ['prunaai/z-image-turbo'],
    defaultReplicateModelId: 'prunaai/z-image-turbo',
    generationEnabled: true,
  },
  chroma: {
    replicateModelIds: [],
    defaultReplicateModelId: null,
    generationEnabled: false,
  },
  'qwen-image': {
    replicateModelIds: [
      'qwen/qwen-image',
      'qwen/qwen-image-2512',
      'qwen/qwen-image-2',
      'qwen/qwen-image-2-pro',
    ],
    defaultReplicateModelId: 'qwen/qwen-image-2',
    generationEnabled: true,
  },
  'wan-image': {
    replicateModelIds: ['prunaai/wan-2.2-image'],
    defaultReplicateModelId: 'prunaai/wan-2.2-image',
    generationEnabled: true,
  },
};

export interface ValidationError {
  key: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  coerced?: unknown;
  error?: ValidationError;
}

function isInteger(n: number): boolean {
  return Number.isFinite(n) && Math.floor(n) === n;
}

export function validateUserOption(
  definition: ModelDefinition,
  key: string,
  value: unknown,
): ValidationResult {
  const configurable = definition.inputOptions.userConfigurable;
  const managed = definition.inputOptions.pipelineManaged;

  if (managed.includes(key)) {
    return {
      valid: false,
      error: { key, reason: `"${key}" is managed by the pipeline and cannot be overridden.` },
    };
  }

  if (!configurable.includes(key)) {
    const validKeys = configurable.join(', ');
    return {
      valid: false,
      error: { key, reason: `"${key}" is not a configurable option for this model. Valid options: ${validKeys}` },
    };
  }

  const field = definition.inputOptions.fields[key];
  if (!field) {
    return {
      valid: false,
      error: { key, reason: `No schema definition found for "${key}".` },
    };
  }

  if (value === null) {
    if (field.nullable) {
      return { valid: true, coerced: null };
    }
    return {
      valid: false,
      error: { key, reason: `"${key}" does not accept null values.` },
    };
  }

  let coerced: unknown = value;

  switch (field.type) {
    case 'integer': {
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || !isInteger(parsed)) {
          return {
            valid: false,
            error: { key, reason: `"${key}" must be an integer.` },
          };
        }
        coerced = parsed;
      } else if (typeof value === 'number') {
        if (!isInteger(value)) {
          return {
            valid: false,
            error: { key, reason: `"${key}" must be an integer.` },
          };
        }
        coerced = value;
      } else {
        return {
          valid: false,
          error: { key, reason: `"${key}" must be an integer.` },
        };
      }
      break;
    }
    case 'number': {
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
          return {
            valid: false,
            error: { key, reason: `"${key}" must be a number.` },
          };
        }
        coerced = parsed;
      } else if (typeof value !== 'number') {
        return {
          valid: false,
          error: { key, reason: `"${key}" must be a number.` },
        };
      }
      break;
    }
    case 'boolean': {
      if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        if (lowered === 'true') coerced = true;
        else if (lowered === 'false') coerced = false;
        else {
          return {
            valid: false,
            error: { key, reason: `"${key}" must be a boolean.` },
          };
        }
      } else if (typeof value !== 'boolean') {
        return {
          valid: false,
          error: { key, reason: `"${key}" must be a boolean.` },
        };
      }
      break;
    }
    case 'string': {
      if (typeof value !== 'string') {
        return {
          valid: false,
          error: { key, reason: `"${key}" must be a string.` },
        };
      }
      break;
    }
    default:
      break;
  }

  if (field.enum && !field.enum.includes(String(coerced))) {
    return {
      valid: false,
      error: { key, reason: `"${key}" must be one of: ${field.enum.join(', ')}.` },
    };
  }

  if (field.minimum !== undefined && typeof coerced === 'number' && coerced < field.minimum) {
    return {
      valid: false,
      error: { key, reason: `"${key}" must be at least ${field.minimum}.` },
    };
  }

  if (field.maximum !== undefined && typeof coerced === 'number' && coerced > field.maximum) {
    return {
      valid: false,
      error: { key, reason: `"${key}" must be at most ${field.maximum}.` },
    };
  }

  return { valid: true, coerced };
}

export function getUserConfigurableFields(definition: ModelDefinition): Array<{ name: string; schema: FieldDefinition }> {
  return definition.inputOptions.userConfigurable
    .map((name) => ({ name, schema: definition.inputOptions.fields[name] }))
    .filter((entry): entry is { name: string; schema: FieldDefinition } => !!entry.schema);
}

export function getSupportedModelCatalog(): SupportedModelCatalogEntry[] {
  return (Object.keys(FAMILY_REGISTRY) as ModelId[]).map((family) => {
    const entry = FAMILY_REGISTRY[family];
    return {
      family,
      displayName: profiles[family].name,
      generationEnabled: entry.generationEnabled,
      replicateModelIds: [...entry.replicateModelIds],
      defaultReplicateModelId: entry.defaultReplicateModelId,
    };
  });
}

/**
 * Resolve the Replicate model ID to use for generation.
 * Returns null if generation is not enabled for the family.
 * Throws if an override is provided but not in the family allowlist.
 */
export function resolveReplicateModelId(
  family: ModelId,
  override?: string,
): string {
  const entry = FAMILY_REGISTRY[family];
  if (!entry.generationEnabled) {
    throw new Error(
      `Model family "${family}" does not support image generation. It is transform-only.`,
    );
  }

  if (override) {
    if (!entry.replicateModelIds.includes(override)) {
      throw new Error(
        `Model "${override}" is not available for family "${family}". ` +
        `Supported models: ${entry.replicateModelIds.join(', ')}`,
      );
    }
    return override;
  }

  if (!entry.defaultReplicateModelId) {
    throw new Error(`No default Replicate model configured for family "${family}".`);
  }

  return entry.defaultReplicateModelId;
}
