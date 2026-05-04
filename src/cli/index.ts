import { Command } from 'commander';
import { limn } from '../index.js';
import { VALID_MODELS } from '../types.js';
import type { ModelId } from '../types.js';
import { settingsCommand } from './settings.js';

export async function runCli(args: string[]): Promise<number> {
  const program = new Command();

  program
    .name('limn')
    .description('Translate natural language prompts into model-optimized T2I prompts')
    .version('0.1.0')
    .exitOverride();

  program
    .argument('<prompt>', 'Natural language prompt to transform')
    .requiredOption('-m, --model <model>', `Target T2I model. One of: ${VALID_MODELS.join(', ')}`)
    .option('--json', 'Output as JSON')
    .action(async (prompt, options) => {
      const model = options.model;
      if (!VALID_MODELS.includes(model as ModelId)) {
        console.error(`Invalid model: ${model}. Must be one of: ${VALID_MODELS.join(', ')}`);
        process.exitCode = 1;
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