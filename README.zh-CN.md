<p align="center"><img src="./assets/avatar/limn-logo.webp" width="128" alt="Limn"></p>
<h1 align="center">Limn</h1>
<p align="center"><em>将粗糙的想法转化为适用于任何 T2I 模型的生产级图像提示词，只需一条命令。</em></p>

<p align="center">
  <a href="https://github.com/telepat-io/limn">📖 文档</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/limn/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/limn/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/limn"><img src="https://codecov.io/gh/telepat-io/limn/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/limn"><img src="https://img.shields.io/npm/v/@telepat/limn" alt="npm"></a>
  <a href="https://github.com/telepat-io/limn/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Limn 将自然语言想法转化为适配各 T2I 模型的优化提示词。选择一个目标模型，描述你想要的画面，Limn 便会用该模型偏好的语法重写你的想法 —— SDXL 的标签风格、FLUX 的自然散文、Wan-Image 的电影感语言，不一而足。

专为开发者、设计师以及任何需要高质量图像提示词，但无需深究每个模型提示差异的用户而打造。

## 功能特性

- **一个提示，适配所有模型** — 支持 FLUX、SDXL、Nano Banana Pro、Seedream‑4、Z‑Image Turbo、Chroma、Qwen Image 和 Wan‑Image。Limn 会针对每种模型的偏好语法重写你的想法。
- **仅转换或直接生成** — 可以只优化提示词，也可以一路生成图像。获得带完整成本与耗时分析的 WebP 文件。
- **按模型定制的提示智能** — 每个模型配置文件都编码了真实的提示规则：SDXL 的逗号标签风格、FLUX 的散文风格、Nano Banana Pro 的推理优先结构。零猜测。
- **内置成本分析** — 每次运行后显示 token 数量、生成时间和 OpenRouter 与 Replicate 的费用。JSON 输出可捕获所有数据，便于自动化。
- **智能 API 密钥管理** — 密钥从环境变量或系统钥匙串解析。不使用明文 dotfile。默认情况下密文值会被脱敏显示。
- **编程接口** — 调用 `limn()`、`limnGenerate()` 或直接传入密钥实例化 `Limn` 类。TypeScript 优先，完整类型覆盖。
- **终端内嵌图片预览** — 终端支持时，生成后可直接在控制台内渲染图像。
- **模型目录 API** — `getSupportedModelCatalog()` 暴露所有模型元数据。可基于 Limn 的权威模型定义驱动下游选择器与校验器。

## 快速开始

安装并完成第一次图像生成：

```bash
npm i -g @telepat/limn
limn settings set openrouterApiKey sk-or-...
limn settings set replicateApiKey r8_...
limn -m flux "a cat in space" --generate
```

预期结果：

- Limn 通过 OpenRouter 将你的提示词转化为 FLUX 优化语法。
- Replicate 生成图像并保存带时间戳的 `.webp` 文件到当前目录。
- 每次运行后显示成本与耗时分析。

## 环境要求

- Node.js 20+
- npm
- OpenRouter API key
- Replicate API token（用于图像生成）

## 工作原理

Limn 加载针对每个模型编写的配置文件，其中编码了该 T2I 模型偏好的提示语法。它通过 OpenRouter 将你的原始提示词连同该配置文件的 system instruction 发送给 LLM。LLM 返回模型优化的提示词。你还可以选择让 Limn 将该提示词发送到 Replicate 进行图像生成。

核心命令：

```bash
# 仅转换
limn -m sdxl "a cat in space"

# 转换并生成
limn -m flux "a cat in space" --generate

# JSON 输出
limn -m flux "a cat in space" --generate --json

# 自定义宽高比
limn -m flux "a cat in space" --generate --aspect-ratio 16:9

# 覆盖 Replicate 模型
limn -m flux "a cat in space" --generate --replicate-model black-forest-labs/flux-2-pro

# 列出模型选项（包括支持的宽高比）
limn -m seedream-4 "a cat in space" --list-options
```

### 宽高比支持

所有模型均通用支持 `1:1`、`16:9` 和 `9:16`。每个模型还根据自身能力支持额外的宽高比 —— Limn 会在发送到 Replicate 之前验证所选宽高比，因此如果该模型不支持，你会立即收到清晰的错误提示。

对任意模型使用 `--list-options` 即可查看其完整的支持宽高比列表。

各模型的提示策略详见 [Prompting Guide](https://github.com/telepat-io/limn/blob/main/docs/PROMPTING_GUIDE.md)。

## 与 AI Agent 一起使用

Limn 专为智能体和自动化工作流设计：

- **机器可读输出** — `--json` 为仅转换和生成运行返回结构化 JSON。所有字段类型化且可预测。
- **编程接口** — 库导出 `limn()` 和 `limnGenerate()` 用于函数式使用，以及用于面向对象工作流的 `Limn` 类，支持直接注入 API 密钥。无需交互式提示。
- **CI 即用** — 通过 `OPENROUTER_API_KEY` 和 `REPLICATE_API_TOKEN` 环境变量或 `Limn` 构造函数传递密钥。无需钥匙串或交互式设置命令。
- **模型目录 API** — `getSupportedModelCatalog()` 暴露权威模型元数据，供下游工具和运行时校验使用。

## 安全与信任

- 默认通过 `limn settings` 将 API 密钥保存到系统钥匙串。
- 在 CI 或容器环境中，请使用 `OPENROUTER_API_KEY` 和 `REPLICATE_API_TOKEN` 环境变量。
- 在无法访问钥匙串时设置 `LIMN_DISABLE_KEYTAR=true`。
- `limn settings list` 会将密钥值脱敏显示为 `***configured***`。
- 生成的图像为模型输出产物，发布前请进行审阅。

如需报告安全问题，请查看 [安全策略](https://github.com/telepat-io/limn/blob/main/SECURITY.md) 或通过仓库安全报告通道私下提交。

## 文档与支持

- [仓库](https://github.com/telepat-io/limn)
- [Prompting Guide](https://github.com/telepat-io/limn/blob/main/docs/PROMPTING_GUIDE.md)
- [npm 包](https://www.npmjs.com/package/@telepat/limn)
- [Issues](https://github.com/telepat-io/limn/issues)

## 贡献

欢迎贡献。请在 [GitHub](https://github.com/telepat-io/limn) 上提交 issue 或 pull request。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
