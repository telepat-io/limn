# Limn

Translate natural language prompts into model-optimized prompts for T2I image generation models, and optionally generate the image.

Each T2I model has different prompting preferences: tag-based, prose, camera-style, and more.
Limn encodes this knowledge into per-model system prompts and uses an LLM (via OpenRouter) to rewrite your raw idea into model-optimized form.

## Install

```bash
npm install -g @telepat/limn
```

For library usage in a project:

```bash
npm install @telepat/limn
```

Requires Node >=20.

Check your Node version:

```bash
node --version
```

## Quick Start

```bash
# Configure your API keys
limn settings set openrouterApiKey sk-or-...
limn settings set replicateApiKey r8_...

# Transform a prompt for SDXL
limn -m sdxl "a cat in space"

# Transform AND generate the image
limn -m flux "a cat in space" --generate

# JSON output
limn -m flux "a cat in space" --generate --json
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

JSON output (generate):

```json
{
  "model": "black-forest-labs/flux-schnell",
  "prompt": "a fluffy tabby cat drifting through deep space...",
  "filename": "limn_flux-schnell_2026-05-05_12-00-00.webp",
  "savedPath": "/abs/path/limn_flux-schnell_2026-05-05_12-00-00.webp",
  "mimeType": "image/webp",
  "analytics": {
    "totalDurationMs": 3200,
    "openrouterDurationMs": 1100,
    "replicateDurationMs": 2100,
    "openrouterUsage": {
      "promptTokens": 42,
      "completionTokens": 18,
      "totalTokens": 60,
      "costUsd": 0.0002,
      "generationId": "gen_abc123"
    },
    "openrouterCostUsd": 0.0002,
    "openrouterGenerationId": "gen_abc123",
    "replicatePredictionId": "abc123xyz",
    "replicateEstimatedCostUsd": 0.003,
    "totalEstimatedCostUsd": 0.0032,
    "costSource": "actual+estimate"
  }
}
```

## Usage

```
limn [options] <prompt>

Options:
  -m, --model <model>            Target T2I model (required at runtime)
  --generate                     Generate the image via Replicate after transforming
  --replicate-model <modelId>    Override the default Replicate model for the selected family
  --aspect-ratio <ratio>         Aspect ratio for generation (default: 1:1)
  --json                         Output as JSON instead of plain text

Settings:
  limn settings set <key> <value>   Set a configuration value
  limn settings get <key>           Get a configuration value
  limn settings list                List all configuration values
  limn settings unset <key>         Remove a configuration value
```

Valid settings keys:

- `openrouterApiKey` (secret)
- `openrouterModel`
- `replicateApiKey` (secret)

Notes:

- `settings list` redacts secret values as `***configured***`.
- Secret keys are stored in OS credential storage by default.

### Supported aspect ratios

`1:1` (default) · `16:9` · `9:16` · `4:3` · `3:4` · `3:2` · `2:3` · `2:1` · `1:2` · `21:9`

Dimension mapping used for generation:

| Ratio | Width | Height |
|-------|-------|--------|
| `1:1` | 1024 | 1024 |
| `16:9` | 1344 | 768 |
| `9:16` | 768 | 1344 |
| `4:3` | 1152 | 896 |
| `3:4` | 896 | 1152 |
| `3:2` | 1216 | 832 |
| `2:3` | 832 | 1216 |
| `2:1` | 1408 | 704 |
| `1:2` | 704 | 1408 |
| `21:9` | 1536 | 640 |

If an unsupported aspect ratio is provided programmatically, Limn falls back to `1:1`.

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

### Valid `--replicate-model` overrides by family

`--replicate-model` must be one of the allowed Replicate model IDs for the selected family.

| Family (`-m`) | Allowed Replicate model IDs | Default |
|---------------|------------------------------|---------|
| `flux` | `black-forest-labs/flux-schnell`, `black-forest-labs/flux-2-pro` | `black-forest-labs/flux-schnell` |
| `sdxl` | `stability-ai/sdxl` | `stability-ai/sdxl` |
| `nano-banana-pro` | `google/nano-banana-pro` | `google/nano-banana-pro` |
| `seedream-4` | `bytedance/seedream-4` | `bytedance/seedream-4` |
| `z-image-turbo` | `prunaai/z-image-turbo` | `prunaai/z-image-turbo` |
| `qwen-image` | `qwen/qwen-image`, `qwen/qwen-image-2512`, `qwen/qwen-image-2`, `qwen/qwen-image-2-pro` | `qwen/qwen-image-2` |
| `wan-image` | `prunaai/wan-2.2-image` | `prunaai/wan-2.2-image` |
| `chroma` | generation not supported | n/a |

## Configuration

Limn resolves API keys in this order:

**OpenRouter key:**
1. `OPENROUTER_API_KEY` environment variable
2. OS keychain (macOS Keychain / Linux libsecret)

**Replicate key:**
1. `REPLICATE_API_TOKEN` environment variable
2. `REPLICATE_API_KEY` environment variable
3. OS keychain

`openrouterModel` is loaded from global config (`limn settings set openrouterModel ...`).
If not set, Limn defaults to `deepseek/deepseek-v4-pro`.

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
| `LIMN_DISABLE_KEYTAR` | Set to `true` (case-insensitive) to skip keychain |
| `NO_COLOR` | Disable color output |
| `FORCE_COLOR` | Force color output when supported |
| `TERM` | Affects color detection (`dumb` disables color) |

## Library API

### Transform only

```ts
import { limn } from '@telepat/limn';

const result = await limn('a cat in space', 'sdxl');
// { model: 'sdxl', prompt: '...', negativePrompt: '...' }
```

JSON output (transform-only with CLI `--json`) follows the same shape:

```json
{
  "model": "sdxl",
  "prompt": "masterpiece, best quality, ...",
  "negativePrompt": "low quality, blurry, ..."
}
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

### Supported model catalog API

```ts
import {
  getSupportedModelCatalog,
  type SupportedModelCatalogEntry,
} from '@telepat/limn';

const catalog = getSupportedModelCatalog();
// [
//   {
//     family: 'flux',
//     displayName: 'FLUX',
//     generationEnabled: true,
//     replicateModelIds: ['black-forest-labs/flux-schnell', 'black-forest-labs/flux-2-pro'],
//     defaultReplicateModelId: 'black-forest-labs/flux-schnell'
//   },
//   ...
// ]
```

Use this API when you need to drive downstream model selectors or runtime validation from Limn's canonical model metadata.

### Additional exports

```ts
import {
  profiles,
  VALID_MODELS,
  getSupportedModelCatalog,
  type ModelId,
  type ModelProfile,
  type SupportedModelCatalogEntry,
  type TransformedResult,
  type OutputFormat,
  type LimnGenerateResult,
  type GenerationAnalytics,
  type OpenRouterUsage,
} from '@telepat/limn';
```

`profiles` exposes the model profiles/system prompts used by Limn.

## Development

```bash
npm run dev        # run CLI from source
npm run lint
npm run typecheck
npm run test
npm run build:guide
```

## Prompting Guide

See [docs/PROMPTING_GUIDE.md](docs/PROMPTING_GUIDE.md) for comprehensive per-model prompting strategies.

`docs/PROMPTING_GUIDE.md` is generated from profile metadata. Regenerate with:

```bash
npm run build:guide
```

## License

MIT