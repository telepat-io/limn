<p align="center"><img src="./assets/avatar/limn-logo.webp" width="128" alt="Limn"></p>
<h1 align="center">Limn</h1>
<p align="center"><em>Turn rough ideas into production-ready image prompts for any T2I model, with one command.</em></p>

<p align="center">
  <a href="https://github.com/telepat-io/limn">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/limn/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/limn/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/limn"><img src="https://codecov.io/gh/telepat-io/limn/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/limn"><img src="https://img.shields.io/npm/v/@telepat/limn" alt="npm"></a>
  <a href="https://github.com/telepat-io/limn/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Limn translates plain ideas into model-optimized prompts for text-to-image generation. Pick a target model, describe what you want, and Limn rewrites your concept using that model's preferred syntax — tag‑based for SDXL, natural prose for FLUX, cinematic language for Wan‑Image, and more.

Built for developers, designers, and anyone who needs production-quality image prompts without studying each model's prompting quirks.

## Features

- **One prompt, any model** — FLUX, SDXL, Nano Banana Pro, Seedream‑4, Z‑Image Turbo, Chroma, Qwen Image, and Wan‑Image. Limn rewrites your idea for whichever syntax that model expects.
- **Transform or generate** — Optimize prompts only, or go all the way with Replicate-backed image generation. Get back a WebP file with full cost and timing analytics.
- **Per-model prompt intelligence** — Every model profile encodes real prompting rules: tag‑based for SDXL, prose for FLUX, reasoning‑first structure for Nano Banana Pro. No guesswork.
- **Cost analytics built-in** — Token counts, generation time, and OpenRouter plus Replicate costs displayed after every run. JSON output captures every number for automation.
- **Smart API key management** — Keys resolve from environment variables or OS keychain. No plaintext dotfiles. Secret values are redacted by default.
- **Programmatic API** — Call `limn()`, `limnGenerate()`, or instantiate the `Limn` class with keys passed directly. TypeScript‑first with full type coverage.
- **Inline image preview** — Terminals that support it render the generated image inside the console after generation.
- **Model catalog API** — `getSupportedModelCatalog()` exposes all model metadata. Drive downstream selectors and validators from Limn's canonical model definitions.

## Quick Start

Install and generate your first image:

```bash
npm i -g @telepat/limn
limn settings set openrouterApiKey sk-or-...
limn settings set replicateApiKey r8_...
limn -m flux "a cat in space" --generate
```

Expected outcome:

- Limn transforms your prompt into FLUX-optimized syntax via OpenRouter.
- Replicate generates and saves a timestamped `.webp` to the current directory.
- Cost and timing analytics are displayed after every run.

## Requirements

- Node.js 20+
- npm
- OpenRouter API key
- Replicate API token (for generation)

## How It Works

Limn loads a per-model profile that encodes the preferred prompt syntax for that T2I model. It sends your raw prompt — plus the profile's system instructions — to an LLM via OpenRouter. The LLM returns a model-optimized prompt. Optionally, Limn sends that prompt to Replicate for image generation.

Core commands:

```bash
# Transform only
limn -m sdxl "a cat in space"

# Transform and generate
limn -m flux "a cat in space" --generate

# JSON output
limn -m flux "a cat in space" --generate --json

# Custom aspect ratio
limn -m flux "a cat in space" --generate --aspect-ratio 16:9

# Override Replicate model
limn -m flux "a cat in space" --generate --replicate-model black-forest-labs/flux-2-pro

# List model options (including supported aspect ratios)
limn -m seedream-4 "a cat in space" --list-options
```

### Aspect Ratio Support

All models support `1:1`, `16:9`, and `9:16` universally. Each model also supports additional ratios depending on its capabilities — Limn validates the chosen ratio before sending it to Replicate, so you get a clear error immediately if the ratio is unsupported by that model.

Use `--list-options` on any model to see its full set of supported aspect ratios.

Per-model prompting strategies are documented in the [Prompting Guide](https://github.com/telepat-io/limn/blob/main/docs/PROMPTING_GUIDE.md).

## Using With AI Agents

Limn is designed for agentic and automated workflows:

- **Machine-readable output** — `--json` returns structured JSON for both transform-only and generate runs. Every field is typed and predictable.
- **Programmatic API** — The library exports `limn()` and `limnGenerate()` for functional use, plus the `Limn` class for object‑oriented workflows with injected API keys. No interactive prompts required.
- **CI‑ready** — Pass keys via `OPENROUTER_API_KEY` and `REPLICATE_API_TOKEN` environment variables, or through the `Limn` constructor. No keychain or interactive settings command needed.
- **Model catalog API** — `getSupportedModelCatalog()` exposes canonical model metadata for downstream tooling and runtime validation.

## Security and Trust

- API keys are stored in the OS keychain by default via `limn settings`.
- In CI or containerized environments, use `OPENROUTER_API_KEY` and `REPLICATE_API_TOKEN` environment variables.
- Set `LIMN_DISABLE_KEYTAR=true` when keychain access is unavailable.
- `limn settings list` redacts secret values as `***configured***`.
- Generated images are model-produced output. Review images before publishing.

To report a security issue, see the [security policy](https://github.com/telepat-io/limn/blob/main/SECURITY.md) or open a private report through the repository security flow.

## Documentation and Support

- [Repository](https://github.com/telepat-io/limn)
- [Prompting Guide](https://github.com/telepat-io/limn/blob/main/docs/PROMPTING_GUIDE.md)
- [npm package](https://www.npmjs.com/package/@telepat/limn)
- [Issues](https://github.com/telepat-io/limn/issues)

## Contributing

Contributions are welcome. Open an issue or pull request on [GitHub](https://github.com/telepat-io/limn).

## License

MIT. See [LICENSE](./LICENSE).
