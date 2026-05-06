import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { limn, limnGenerate } from '../index.js';
import { profiles } from '../profiles/index.js';
import { VALID_MODELS } from '../types.js';
import type { ModelId, GenerationAnalytics } from '../types.js';
import { settingsCommand } from './settings.js';
import { renderBestForTerminal, detectTerminalCapabilities } from '@telepat/ansie';
import { readGlobalConfig } from '../core/config.js';
import { callOpenRouterFull } from '../core/openrouter.js';
import { generateImage } from '../core/imageGeneration.js';
import { buildAnalytics } from '../core/costs.js';
import {
  resolveReplicateModelId,
  DEFINITIONS_BY_MODEL_ID,
  getUserConfigurableFields,
  getSupportedAspectRatios,
  getGenerationInputMode,
} from '../models/registry.js';

function resolveCliVersion(): string {
  const envVersion = process.env['npm_package_version'];
  if (envVersion) {
    return envVersion;
  }

  let dir = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const parsed = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: unknown };
        if (typeof parsed.version === 'string' && parsed.version.length > 0) {
          return parsed.version;
        }
      } catch {
        // Ignore unreadable or invalid package.json files while traversing upward.
      }
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return '0.0.0';
}

const CLI_VERSION = resolveCliVersion();

// ── Color support ─────────────────────────────────────────────────────────────

function detectColorSupport(): boolean {
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (process.env['FORCE_COLOR'] !== undefined && process.env['FORCE_COLOR'] !== '0') return true;
  if (process.env['TERM'] === 'dumb') return false;
  return Boolean(process.stdout.isTTY);
}

type Colors = ReturnType<typeof makeColors>;

function makeColors(enabled: boolean) {
  const wrap = (open: string, close: string) =>
    enabled ? (s: string) => `\x1b[${open}m${s}\x1b[${close}m` : (s: string) => s;
  return {
    dim:    wrap('2', '22'),
    bold:   wrap('1', '22'),
    cyan:   wrap('36', '39'),
    green:  wrap('32', '39'),
    yellow: wrap('33', '39'),
    red:    wrap('31', '39'),
  };
}

// strip ANSI escape codes to get visual (printable) length
function visLen(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class CliSpinner {
  private readonly animated: boolean;
  private readonly c: Colors;
  private timer: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private lastLen = 0;

  constructor(animated: boolean, c: Colors) {
    this.animated = animated;
    this.c = c;
  }

  start(text: string): void {
    if (this.animated) {
      this.writeInline(`${this.c.cyan(SPINNER_FRAMES[0] ?? '…')} ${text}`);
      this.timer = setInterval(() => {
        this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
        this.writeInline(`${this.c.cyan(SPINNER_FRAMES[this.frameIndex] ?? '…')} ${text}`);
      }, 90);
    } else {
      console.log(`  ${text}…`);
    }
  }

  succeed(text: string): void {
    this.stop();
    if (this.animated) {
      this.writeLine(`${this.c.green('[ok]')} ${text}`);
    } else {
      console.log(`  [ok] ${text}`);
    }
  }

  fail(text: string): void {
    this.stop();
    if (this.animated) {
      this.writeLine(`${this.c.red('[x]')} ${text}`);
    } else {
      console.error(`  [x] ${text}`);
    }
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private writeInline(line: string): void {
    const vl = visLen(line);
    const pad = vl < this.lastLen ? ' '.repeat(this.lastLen - vl) : '';
    this.lastLen = vl;
    process.stdout.write(`\r${line}${pad}`);
  }

  private writeLine(line: string): void {
    const vl = visLen(line);
    const pad = vl < this.lastLen ? ' '.repeat(this.lastLen - vl) : '';
    this.lastLen = 0;
    process.stdout.write(`\r${line}${pad}\n`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitNegativePrompt(text: string, supportsNegativePrompt: boolean): { prompt: string; negativePrompt?: string } {
  if (!supportsNegativePrompt) return { prompt: text.trim() };
  const negMatch = text.match(/negative_prompt:\s*(.+)/is);
  if (!negMatch) return { prompt: text.trim() };
  return {
    prompt: text.replace(/negative_prompt:\s*.+/is, '').trim(),
    negativePrompt: negMatch[1].trim(),
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd: number | null): string {
  if (usd === null) return 'unknown';
  if (usd < 0.0001) return '<$0.0001';
  return `$${usd.toFixed(4)}`;
}

function printAnalytics(analytics: GenerationAnalytics, c: Colors): void {
  const rule = c.dim('─'.repeat(52));
  const lbl = (s: string) => c.dim(s);
  const val = (s: string) => c.yellow(s);

  console.log('');
  console.log(rule);
  console.log(`  ${lbl('Total time:       ')} ${val(formatDuration(analytics.totalDurationMs))}`);
  console.log(`  ${lbl('Prompt transform: ')} ${val(formatDuration(analytics.openrouterDurationMs))}`);
  console.log(`  ${lbl('Image generation: ')} ${val(formatDuration(analytics.replicateDurationMs))}`);
  console.log('');
  const tokenHint = analytics.openrouterUsage ? c.dim(` (${analytics.openrouterUsage.totalTokens} tokens)`) : '';
  console.log(`  ${lbl('OpenRouter cost:  ')} ${val(formatCost(analytics.openrouterCostUsd))}${tokenHint}`);
  console.log(`  ${lbl('Replicate cost:   ')} ${val(formatCost(analytics.replicateEstimatedCostUsd))}${c.dim(' (estimated)')}`);
  console.log(`  ${lbl('Total est. cost:  ')} ${val(formatCost(analytics.totalEstimatedCostUsd))}`);
  if (analytics.costSource !== 'unknown') {
    console.log(`  ${lbl('Cost source:      ')} ${c.dim(analytics.costSource)}`);
  }
  console.log(`  ${lbl('Prediction ID:    ')} ${c.dim(analytics.replicatePredictionId)}`);
  if (analytics.openrouterGenerationId) {
    console.log(`  ${lbl('OR generation ID: ')} ${c.dim(analytics.openrouterGenerationId)}`);
  }
  console.log(rule);
}

// ── List options helper ───────────────────────────────────────────────────────

function printModelOptions(modelId: ModelId, c: Colors): void {
  const replicateModelSlug = resolveReplicateModelId(modelId);
  const definition = DEFINITIONS_BY_MODEL_ID[replicateModelSlug];
  if (!definition) {
    console.error(`No definition found for model "${modelId}".`);
    return;
  }

  const fields = getUserConfigurableFields(definition);
  const mode = getGenerationInputMode(definition);
  const ratios = getSupportedAspectRatios(definition);

  if (fields.length === 0 && ratios.length === 0) {
    console.log(c.dim('No user-configurable options for this model.'));
    return;
  }

  console.log(`${c.bold('Options for')} ${c.cyan(modelId)} ${c.dim(`(${replicateModelSlug})`)}`);
  console.log('');

  // Aspect ratios
  const modeLabel = mode === 'aspect_ratio' ? '' : c.dim(' (via width/height mapping)');
  console.log(`  ${c.cyan('aspect_ratio'.padEnd(22))}  ${ratios.join(', ')}${modeLabel}`);
  console.log('');

  // User-configurable fields
  if (fields.length > 0) {
    const nameWidth = Math.max(...fields.map((f) => f.name.length), 4);

    for (const { name, schema } of fields) {
      const typeLabel = schema.enum
        ? `enum[${schema.enum.join(', ')}]`
        : schema.type;
      const defaultLabel = schema.default !== undefined ? `default: ${String(schema.default)}` : '';
      const rangeLabel =
        schema.minimum !== undefined && schema.maximum !== undefined
          ? `${schema.minimum}..${schema.maximum}`
          : schema.minimum !== undefined
            ? `>=${schema.minimum}`
            : schema.maximum !== undefined
              ? `<=${schema.maximum}`
              : '';
      const meta = [typeLabel, rangeLabel, defaultLabel].filter(Boolean).join(' | ');
      console.log(`  ${c.cyan(name.padEnd(nameWidth))}  ${c.dim(meta)}`);
    }
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

export async function runCli(args: string[]): Promise<number> {
  const program = new Command();

  program
    .name('limn')
    .description('Translate natural language prompts into model-optimized T2I prompts')
    .version(CLI_VERSION)
    .exitOverride();

  program
    .argument('<prompt>', 'Natural language prompt to transform')
    .option('-m, --model <model>', `Target T2I model. One of: ${VALID_MODELS.join(', ')}`)
    .option('--json', 'Output as JSON')
    .option('--generate', 'Generate the image via Replicate after transforming the prompt')
    .option('--replicate-model <modelId>', 'Override the default Replicate model for the selected family')
    .option('--aspect-ratio <ratio>', 'Aspect ratio for generation (universally supported: 1:1, 16:9, 9:16)', '1:1')
    .option('--options <json>', 'JSON object of user-configurable model options (e.g. \'{"num_outputs":2}\')')
    .option('--list-options', 'List available options for the selected model and exit')
    .action(async (prompt, options) => {
      const model = options.model;
      if (!model) {
        console.error(`error: required option '-m, --model <model>' not specified`);
        process.exitCode = 1;
        return;
      }
      if (!VALID_MODELS.includes(model as ModelId)) {
        console.error(`Invalid model: ${model}. Must be one of: ${VALID_MODELS.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      const modelId = model as ModelId;

      if (options.listOptions) {
        const c = makeColors(detectColorSupport());
        printModelOptions(modelId, c);
        return;
      }

      let parsedOptions: Record<string, unknown> | undefined;
      if (options.options) {
        try {
          parsedOptions = JSON.parse(options.options) as Record<string, unknown>;
        } catch {
          console.error('error: --options must be a valid JSON object string');
          process.exitCode = 1;
          return;
        }
        if (typeof parsedOptions !== 'object' || parsedOptions === null || Array.isArray(parsedOptions)) {
          console.error('error: --options must be a valid JSON object');
          process.exitCode = 1;
          return;
        }
      }

      if (options.generate) {
        try {
          if (options.json) {
            const result = await limnGenerate(prompt, modelId, {
              replicateModel: options.replicateModel,
              aspectRatio: options.aspectRatio,
              options: parsedOptions,
            });
            console.log(JSON.stringify({
              model: result.modelSlug,
              prompt: result.promptUsed,
              filename: result.filename,
              savedPath: result.savedPath,
              mimeType: result.mimeType,
              analytics: result.analytics,
            }));
            return;
          }

          const profile = profiles[modelId];
          if (!profile) throw new Error(`Unknown model: ${modelId}`);

          const c = makeColors(detectColorSupport());
          const isTTY = Boolean(process.stdout.isTTY);
          const spinner = new CliSpinner(isTTY, c);

          const config = await readGlobalConfig();
          const openrouterModel = config.openrouterModel ?? 'deepseek/deepseek-v4-pro';
          const replicateModelSlug = resolveReplicateModelId(modelId, options.replicateModel);
          const totalStartMs = Date.now();

          console.log(`${c.dim('OpenRouter model:')} ${c.cyan(openrouterModel)}`);
          console.log(`${c.dim('Replicate model: ')} ${c.cyan(replicateModelSlug)}`);
          console.log('');

          spinner.start(`Transforming prompt  (${openrouterModel})`);
          const orResult = await callOpenRouterFull(profile.systemPrompt, prompt, undefined, config);
          spinner.succeed(`Prompt transformed   (${c.dim(openrouterModel)})`);

          const transformed = splitNegativePrompt(orResult.text, profile.supportsNegativePrompt);

          console.log('');
          console.log(c.dim('Transformed prompt:'));
          console.log(transformed.prompt);
          if (transformed.negativePrompt) {
            console.log('');
            console.log(`${c.dim('negative_prompt:')} ${transformed.negativePrompt}`);
          }
          console.log(''); // spacing under the prompt

          spinner.start(`Generating image     (${replicateModelSlug})`);
          const imageResult = await generateImage({
            family: modelId,
            prompt: transformed.prompt,
            negativePrompt: transformed.negativePrompt,
            replicateModelOverride: options.replicateModel,
            aspectRatio: options.aspectRatio,
            config,
            options: parsedOptions,
          });
          spinner.succeed(`Image generated      (${c.dim(imageResult.modelSlug)})`);

          const analytics = buildAnalytics(
            totalStartMs,
            orResult.durationMs,
            orResult.usage,
            {
              predictionId: imageResult.replicatePredictionId,
              metrics: { predict_time: imageResult.replicateDurationMs / 1000 },
              definition: imageResult.definition,
              input: imageResult.inputSentToModel,
            },
          );

          console.log('');
          console.log(`${c.dim('Image saved:')} ${c.cyan(imageResult.savedPath)}`);
          console.log(`${c.dim('Model used: ')} ${c.cyan(imageResult.modelSlug)}`);

          printAnalytics(analytics, c);

          const capabilities = detectTerminalCapabilities();
          if (capabilities.isTTY && capabilities.ansi) {
            spinner.start('Rendering image in terminal');
            try {
              const renderResult = await renderBestForTerminal(
                { buffer: imageResult.buffer },
                { width: capabilities.columns ? capabilities.columns - 2 : 80 },
              );
              spinner.succeed('Rendered image in terminal');
              console.log('');
              console.log(renderResult.content);
            } catch {
              spinner.fail('Could not render image in terminal (skipped)');
            }
          }
        } catch (err) {
          console.error(`limn: ${err instanceof Error ? err.message : err}`);
          process.exitCode = 1;
        }
        return;
      }

      try {
        const result = await limn(prompt, model as ModelId);
        if (options.json) {
          console.log(JSON.stringify(result));
        } else {
          console.log(result.prompt);
          if (result.negativePrompt) {
            console.log(`\nnegative_prompt: ${result.negativePrompt}`);
          }
        }
      } catch (err) {
        console.error(`limn: ${err instanceof Error ? err.message : err}`);
        process.exitCode = 1;
      }
    });

  program.addCommand(settingsCommand());

  try {
    await program.parseAsync(args, { from: 'user' });
    return 0;
  } catch (err) {
    if (err instanceof Error && err.message.includes('required')) {
      console.error(err.message);
      return 1;
    }
    return 1;
  }
}

