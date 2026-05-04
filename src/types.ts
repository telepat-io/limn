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