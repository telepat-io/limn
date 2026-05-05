# Limn

将自然语言提示词转换为适配不同 T2I 图像模型的优化提示词，并可选直接生成图片。

不同 T2I 模型的提示偏好差异很大：有的偏标签、有的偏自然语言、有的偏镜头脚本。Limn 将这些规则编码为按模型划分的 system prompt，并通过 OpenRouter 上的 LLM 把原始想法改写成模型可用的高质量提示词。

## 安装

```bash
npm install -g @telepat/limn
```

需要 Node >=20。

检查 Node 版本：

```bash
node --version
```

## 快速开始

```bash
# 配置 API Key
limn settings set openrouterApiKey sk-or-...
limn settings set replicateApiKey r8_...

# 为 SDXL 转换提示词
limn -m sdxl "a cat in space"

# 转换并生成图片
limn -m flux "a cat in space" --generate

# JSON 输出
limn -m flux "a cat in space" --generate --json
```

仅转换输出示例：

```
masterpiece, best quality, (fluffy orange tabby cat:1.3), floating in
outer space, cosmic nebula background, (starry sky:1.2), detailed fur
texture, soft rim lighting, 8k uhd

negative_prompt: low quality, blurry, distorted, extra limbs, watermark
```

生成输出示例：

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

如果终端支持，生成完成后会尝试在终端内联渲染图片。

JSON 输出示例（生成）：

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

## 用法

```
limn [options] <prompt>

Options:
  -m, --model <model>            目标 T2I 模型（运行时必填）
  --generate                     转换后通过 Replicate 生成图片
  --replicate-model <modelId>    覆盖该模型家族默认的 Replicate 模型
  --aspect-ratio <ratio>         生成时宽高比（默认: 1:1）
  --json                         输出 JSON

Settings:
  limn settings set <key> <value>   设置配置项
  limn settings get <key>           获取配置项
  limn settings list                列出全部配置项
  limn settings unset <key>         删除配置项
```

可用 settings key：

- `openrouterApiKey`（密钥）
- `openrouterModel`
- `replicateApiKey`（密钥）

说明：

- `settings list` 会将密钥值脱敏显示为 `***configured***`。
- 默认情况下，密钥写入操作系统凭据存储。

### 支持的宽高比

`1:1`（默认）· `16:9` · `9:16` · `4:3` · `3:4` · `3:2` · `2:3` · `2:1` · `1:2` · `21:9`

生成时使用如下像素映射：

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

如果在编程接口中传入不支持的宽高比，Limn 会回退到 `1:1`。

## 支持模型

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

### 各模型家族可用的 `--replicate-model` 覆盖值

`--replicate-model` 必须是当前 `-m` 所属家族允许的 Replicate model ID。

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

## 配置

Limn 按以下顺序解析 API Key：

**OpenRouter key：**
1. 环境变量 `OPENROUTER_API_KEY`
2. 系统密钥存储（macOS Keychain / Linux libsecret）

**Replicate key：**
1. 环境变量 `REPLICATE_API_TOKEN`
2. 环境变量 `REPLICATE_API_KEY`
3. 系统密钥存储

`openrouterModel` 从全局配置读取（`limn settings set openrouterModel ...`）。
如果未设置，默认使用 `deepseek/deepseek-v4-pro`。

设置用于提示词转换的 LLM：

```bash
limn settings set openrouterModel deepseek/deepseek-v4-pro
```

### 环境变量

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `REPLICATE_API_TOKEN` | Replicate API key（最高优先级） |
| `REPLICATE_API_KEY` | Replicate API key（备用变量名） |
| `LIMN_DISABLE_KEYTAR` | 设为 `true`（大小写不敏感）可禁用 keychain |
| `NO_COLOR` | 禁用彩色输出 |
| `FORCE_COLOR` | 强制启用彩色输出（终端支持时） |
| `TERM` | 影响颜色检测（`dumb` 会禁用颜色） |

## Library API

### 仅转换

```ts
import { limn } from '@telepat/limn';

const result = await limn('a cat in space', 'sdxl');
// { model: 'sdxl', prompt: '...', negativePrompt: '...' }
```

仅转换的 CLI `--json` 输出同样遵循该结构：

```json
{
  "model": "sdxl",
  "prompt": "masterpiece, best quality, ...",
  "negativePrompt": "low quality, blurry, ..."
}
```

### 生成图片

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

### Class 方式（注入 API Key）

```ts
import { Limn } from '@telepat/limn';

const limn = new Limn({
  openrouterApiKey: 'sk-or-...',
  replicateApiKey: 'r8_...',
});

// 仅转换
const transformed = await limn.transform('a cat in space', 'flux');

// 转换 + 生成
const result = await limn.generate('a cat in space', 'flux', {
  aspectRatio: '16:9',
  replicateModel: 'black-forest-labs/flux-2-pro', // 可选覆盖
});
```

### Analytics 对象

`limnGenerate` 与 `Limn.generate()` 都会返回 `GenerationAnalytics`：

```ts
interface GenerationAnalytics {
  totalDurationMs: number;
  openrouterDurationMs: number;
  replicateDurationMs: number;
  openrouterUsage: OpenRouterUsage | null;
  openrouterCostUsd: number | null;       // OpenRouter 实际成本
  openrouterGenerationId: string | null;
  replicatePredictionId: string;
  replicateEstimatedCostUsd: number | null; // 基于价格表估算
  totalEstimatedCostUsd: number | null;
  costSource: 'actual+estimate' | 'estimate-only' | 'unknown';
}
```

### 其他导出

```ts
import {
  profiles,
  VALID_MODELS,
  type ModelId,
  type ModelProfile,
  type TransformedResult,
  type OutputFormat,
  type LimnGenerateResult,
  type GenerationAnalytics,
  type OpenRouterUsage,
} from '@telepat/limn';
```

`profiles` 暴露了 Limn 内部使用的模型 profile/system prompt。

## 开发

```bash
npm run dev        # 从源码运行 CLI
npm run lint
npm run typecheck
npm run test
npm run build:guide
```

## Prompting Guide

查看 [docs/PROMPTING_GUIDE.md](docs/PROMPTING_GUIDE.md) 获取完整的分模型提示词策略。

`docs/PROMPTING_GUIDE.md` 由 profile 元数据生成，可通过以下命令重新生成：

```bash
npm run build:guide
```

## License

MIT
