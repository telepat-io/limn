export type OutputFormat =
  | 'prose'
  | 'tags'
  | 'camera-prose'
  | 'sentence'
  | 'reasoning'
  | 'cinematographic'
  | 'style-forward'
  | 'natural';

export interface ModelProfile {
  id: string;
  name: string;
  outputFormat: OutputFormat;
  supportsNegativePrompt: boolean;
  persona: string;
  systemPrompt: string;
  avoidPatterns: string[];
}

export interface LimnOptions {
  model: string;
  json?: boolean;
}

export interface TransformedResult {
  model: string;
  prompt: string;
  negativePrompt?: string;
}

export interface GlobalConfig {
  openrouterApiKey?: string;
  openrouterModel?: string;
  replicateApiKey?: string;
  modelOptions?: Record<string, Record<string, unknown>>;
}

export interface OpenRouterUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
  generationId: string | null;
}

export interface OpenRouterFullResult {
  text: string;
  usage: OpenRouterUsage;
  durationMs: number;
}

export interface GenerationAnalytics {
  totalDurationMs: number;
  openrouterDurationMs: number;
  replicateDurationMs: number;
  openrouterUsage: OpenRouterUsage | null;
  openrouterCostUsd: number | null;
  openrouterGenerationId: string | null;
  replicatePredictionId: string;
  replicateEstimatedCostUsd: number | null;
  totalEstimatedCostUsd: number | null;
  costSource: 'actual+estimate' | 'estimate-only' | 'unknown';
}

export interface LimnGenerateResult {
  image: Buffer;
  filename: string;
  savedPath: string;
  mimeType: string;
  modelSlug: string;
  promptUsed: string;
  analytics: GenerationAnalytics;
}

export interface SupportedModelCatalogEntry {
  family: ModelId;
  displayName: string;
  generationEnabled: boolean;
  replicateModelIds: string[];
  defaultReplicateModelId: string | null;
}

export const VALID_MODELS = [
  'flux',
  'sdxl',
  'nano-banana-pro',
  'seedream-4',
  'z-image-turbo',
  'chroma',
  'qwen-image',
  'wan-image',
] as const;

export type ModelId = typeof VALID_MODELS[number];