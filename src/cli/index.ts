import { Command } from 'commander';
import { limn, limnGenerate } from '../index.js';
import { VALID_MODELS } from '../types.js';
import type { ModelId, GenerationAnalytics } from '../types.js';
import { settingsCommand } from './settings.js';
import { renderBestForTerminal, detectTerminalCapabilities } from '@telepat/ansie';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd: number | null): string {
  if (usd === null) return 'unknown';
  if (usd < 0.0001) return '<$0.0001';
  return `$${usd.toFixed(4)}`;
}

function printAnalytics(analytics: GenerationAnalytics): void {
  console.log('');
  console.log('── Generation Analytics ──────────────────────────────');
  console.log(`  Total time:        ${formatDuration(analytics.totalDurationMs)}`);
  console.log(`  Prompt transform:  ${formatDuration(analytics.openrouterDurationMs)}`);
  console.log(`  Image generation:  ${formatDuration(analytics.replicateDurationMs)}`);
  console.log('');
  console.log(`  OpenRouter cost:   ${formatCost(analytics.openrouterCostUsd)}${analytics.openrouterUsage ? ` (${analytics.openrouterUsage.totalTokens} tokens)` : ''}`);
  console.log(`  Replicate cost:    ${formatCost(analytics.replicateEstimatedCostUsd)} (estimated)`);
  console.log(`  Total est. cost:   ${formatCost(analytics.totalEstimatedCostUsd)}`);
  if (analytics.costSource !== 'unknown') {
    console.log(`  Cost source:       ${analytics.costSource}`);
  }
  console.log(`  Prediction ID:     ${analytics.replicatePredictionId}`);
  if (analytics.openrouterGenerationId) {
    console.log(`  OR generation ID:  ${analytics.openrouterGenerationId}`);
  }
  console.log('──────────────────────────────────────────────────────');
}

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
          const result = await limnGenerate(prompt, model as ModelId, {
            replicateModel: options.replicateModel,
            aspectRatio: options.aspectRatio,
          });

          if (options.json) {
            console.log(JSON.stringify({
              model: result.modelSlug,
              prompt: result.promptUsed,
              filename: result.filename,
              savedPath: result.savedPath,
              mimeType: result.mimeType,
              analytics: result.analytics,
            }));
          } else {
            console.log(`Transformed prompt: ${result.promptUsed}`);
            console.log(`\nImage saved: ${result.savedPath}`);
            console.log(`Model used:  ${result.modelSlug}`);

            printAnalytics(result.analytics);

            // Render image in terminal if TTY supports it
            const capabilities = detectTerminalCapabilities();
            if (capabilities.isTTY && capabilities.ansi) {
              try {
                console.log('');
                const renderResult = await renderBestForTerminal(
                  { buffer: result.image },
                  { width: capabilities.columns ? capabilities.columns - 2 : 80 },
                );
                console.log(renderResult.content);
              } catch {
                // Non-fatal: skip render if it fails
              }
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
