# Limn

Translate natural language prompts into model-optimized prompts for T2I image generation models.

Each T2I model has wildly different prompting preferences — tag-based, prose, camera-style, etc.
Limn encodes this knowledge into per-model system prompts and uses an LLM (via OpenRouter) to rewrite your raw idea into model-optimized form.

## Install

```bash
npm install -g @telepat/limn
```

Requires Node >=20.

## Quick Start

```bash
# Configure your OpenRouter API key
limn settings set openrouterApiKey sk-or-...

# Transform a prompt for SDXL
limn -m sdxl "a cat in space"
```

Output:
```
masterpiece, best quality, (fluffy orange tabby cat:1.3), floating in
outer space, cosmic nebula background, (starry sky:1.2), detailed fur
texture, soft rim lighting, 8k uhd

negative_prompt: low quality, blurry, distorted, extra limbs, watermark
```

## Usage

```
limn [options] <prompt>

Options:
  -m, --model <model>  Target T2I model (required)
  --json               Output as JSON instead of plain text

Settings:
  limn settings set <key> <value>   Set a configuration value
  limn settings get <key>           Get a configuration value
  limn settings list                List all configuration values
  limn settings unset <key>         Remove a configuration value
```

## Supported Models

| Model | Provider | Style |
|-------|----------|-------|
| `flux` | Black Forest Labs | Natural prose, front-loaded, layered |
| `sdxl` | Stability AI | Comma tags + quality boosters + negative prompt |
| `nano-banana-pro` | Google DeepMind | Reasoning-first, 5-part structure |
| `seedream-4` | ByteDance | Full sentences, no tags, quote-wrap text |
| `z-image-turbo` | Alibaba / Tongyi-MAI | Camera-style prose, no negative prompts |
| `chroma` | WaveSpeed AI / Community | Style-forward, exhaustive |
| `qwen-image` | Alibaba / Qwen | Natural language + quality suffix, positional logic |
| `wan-image` | Alibaba / Wan | Cinematographic lexicon |

## Configuration

Limn resolves your OpenRouter API key in this order:

1. `OPENROUTER_API_KEY` environment variable (highest priority)
2. OS keychain (macOS Keychain / Linux libsecret)
3. (API keys are never stored in plaintext config files)

The LLM model used for transformations can be set via:

```bash
limn settings set openrouterModel deepseek/deepseek-v4-pro
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key (highest precedence) |
| `LIMN_DISABLE_KEYTAR` | Set to `true` to skip keychain |

## Library API

```ts
import { limn, profiles, VALID_MODELS } from '@telepat/limn';

const result = await limn('a cat in space', 'sdxl');
// { model: 'sdxl', prompt: '...', negativePrompt: '...' }
```

## Prompting Guide

See [docs/PROMPTING_GUIDE.md](docs/PROMPTING_GUIDE.md) for comprehensive per-model prompting strategies.

## License

MIT