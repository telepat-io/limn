import { Command } from 'commander';
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
import { resolveReplicateModelId } from '../models/registry.js';

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

// ── CLI ───────────────────────────────────────────────────────────────────────

export async function runCli(args: string[]): Promise<number> {
  const program = new Command();

  program
    .name('limn')
    .description('Translate natural language prompts into model-optimized T2I prompts')
    .version('0.1.0')
    .exitOverride();

  program
    .argument('<prompt>', 'Natural language prompt to transform')
    .option('-m, --model <model>', `Target T2I model. One of: ${VALID_MODELS.join(', ')}`)
    .option('--json', 'Output as JSON')
    .option('--generate', 'Generate the image via Replicate after transforming the prompt')
    .option('--replicate-model <modelId>', 'Override the default Replicate model for the selected family')
    .option('--aspect-ratio <ratio>', 'Aspect ratio for generation (e.g. 1:1, 16:9, 9:16)', '1:1')
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

      if (options.generate) {
        try {
          const modelId = model as ModelId;

          if (options.json) {
            const result = await limnGenerate(prompt, modelId, {
              replicateModel: options.replicateModel,
              aspectRatio: options.aspectRatio,
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

