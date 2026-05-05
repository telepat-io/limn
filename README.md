# Limn

Translate natural language prompts into model-optimized prompts for T2I image generation models — and optionally generate the image too.

Each T2I model has wildly different prompting preferences — tag-based, prose, camera-style, etc.
Limn encodes this knowledge into per-model system prompts and uses an LLM (via OpenRouter) to rewrite your raw idea into model-optimized form.

## Install

```bash
npm install -g @telepat/limn
```

Requires Node >=20.

## Quick Start

```bash
# Configure your API keys
limn settings set openrouterApiKey sk-or-...
limn settings set replicateApiKey r8_...

# Transform a prompt for SDXL
limn -m sdxl "a cat in space"

# Transform AND generate the image
limn -m flux "a cat in space" --generate
```

Transform-only output:
```
masterpiece, best quality, (fluffy orange tabby cat:1.3), floating in
outer space, cosmic nebula background, (starry sky:1.2), detailed fur
texture, soft rim lighting, 8k uhd

negative_prompt: low quality, blurry, distorted, extra limbs, watermark
```

Generate output:
```
Transformed prompt: a fluffy tabby cat drifting through deep space...

Image saved: ./limn_flux-schnell_2026-05-05_12-00-00.webp
Model used:  black-forest-labs/flux-schnell

── Generation Analytics ──────────────────────────────
  Total time:        3.2s
  Prompt transform:  1.1s
  Image generation:  2.1s

  OpenRouter cost:   $0.0002 (60 tokens)
  Replicate cost:    $0.0030 (estimated)
  Total est. cost:   $0.0032
  Cost source:       actual+estimate
  Prediction ID:     abc123xyz
──────────────────────────────────────────────────────
```

If the terminal supports it, the image is rendered inline after generation.

## Usage

```
limn [options] <prompt>

Options:
  -m, --model <model>            Target T2I model (required)
  --generate                     Generate the image via Replicate after transforming
  --replicate-model <modelId>    Override the default Replicate model for the family
  --aspect-ratio <ratio>         Aspect ratio for generation (default: 1:1)
  --json                         Output as JSON instead of plain text

Settings:
  limn settings set <key> <value>   Set a configuration value
  limn settings get <key>           Get a configuration value
  limn settings list                List all configuration values
  limn settings unset <key>         Remove a configuration value
```

### Supported aspect ratios

`1:1` (default) · `16:9` · `9:16` · `4:3` · `3:4` · `3:2` · `2:3` · `2:1` · `1:2` · `21:9`

## Supported Models

| Model | Provider | Style | Generation |
|-------|----------|-------|-----------|
| `flux` | Black Forest Labs | Natural prose, front-loaded, layered | ✓ |
| `sdxl` | Stability AI | Comma tags + quality boosters + negative prompt | ✓ |
| `nano-banana-pro` | Google DeepMind | Reasoning-first, 5-part structure | ✓ |
| `seedream-4` | ByteDance | Full sentences, no tags, quote-wrap text | ✓ |
| `z-image-turbo` | Alibaba / Tongyi-MAI | Camera-style prose, no negative prompts | ✓ |
| `chroma` | WaveSpeed AI / Community | Style-forward, exhaustive | Transform only |
| `qwen-image` | Alibaba / Qwen | Natural language + quality suffix, positional logic | ✓ |
| `wan-image` | Alibaba / Wan | Cinematographic lexicon | ✓ |

## Configuration

Limn resolves API keys in this order:

**OpenRouter key:**
1. `OPENROUTER_API_KEY` environment variable
2. OS keychain (macOS Keychain / Linux libsecret)

**Replicate key:**
1. `REPLICATE_API_TOKEN` environment variable
2. `REPLICATE_API_KEY` environment variable
3. OS keychain

The LLM model used for prompt transformations can be set via:

```bash
limn settings set openrouterModel deepseek/deepseek-v4-pro
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `REPLICATE_API_TOKEN` | Replicate API key (highest precedence) |
| `REPLICATE_API_KEY` | Replicate API key (alternate name) |
| `LIMN_DISABLE_KEYTAR` | Set to `true` to skip keychain |

## Library API

### Transform only

```ts
import { limn } from '@telepat/limn';

const result = await limn('a cat in space', 'sdxl');
// { model: 'sdxl', prompt: '...', negativePrompt: '...' }
```

### Generate image

```ts
import { limnGenerate } from '@telepat/limn';

const result = await limnGenerate('a cat in space', 'flux');
// {
//   image: Buffer,
//   filename: 'limn_flux-schnell_2026-05-05_12-00-00.webp',
//   savedPath: '/path/to/limn_flux-schnell_2026-05-05_12-00-00.webp',
//   mimeType: 'image/webp',
//   modelSlug: 'black-forest-labs/flux-schnell',
//   promptUsed: '...',
//   analytics: { totalDurationMs, openrouterCostUsd, replicatePredictionId, ... }
// }
```

### Class-based (inject API keys)

```ts
import { Limn } from '@telepat/limn';

const limn = new Limn({
  openrouterApiKey: 'sk-or-...',
  replicateApiKey: 'r8_...',
});

// Transform only
const transformed = await limn.transform('a cat in space', 'flux');

// Transform + generate
const result = await limn.generate('a cat in space', 'flux', {
  aspectRatio: '16:9',
  replicateModel: 'black-forest-labs/flux-2-pro', // optional override
});
```

### Analytics object

Both `limnGenerate` and `Limn.generate()` return a `GenerationAnalytics` object:

```ts
interface GenerationAnalytics {
  totalDurationMs: number;
  openrouterDurationMs: number;
  replicateDurationMs: number;
  openrouterUsage: OpenRouterUsage | null;
  openrouterCostUsd: number | null;       // actual cost from OpenRouter
  openrouterGenerationId: string | null;
  replicatePredictionId: string;
  replicateEstimatedCostUsd: number | null; // estimated from pricing tables
  totalEstimatedCostUsd: number | null;
  costSource: 'actual+estimate' | 'estimate-only' | 'unknown';
}
```

## Prompting Guide

See [docs/PROMPTING_GUIDE.md](docs/PROMPTING_GUIDE.md) for comprehensive per-model prompting strategies.

## License

MIT