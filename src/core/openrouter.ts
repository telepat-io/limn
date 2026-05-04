import OpenAI from 'openai';
import type { GlobalConfig } from '../types.js';
import { readGlobalConfig } from './config.js';

let client: OpenAI | null = null;

function getClient(openrouterApiKey: string): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/telepat-io/limn',
        'X-Title': 'Limn',
      },
    });
  }

  return client;
}

export function resetClient(): void {
  client = null;
}

export type CallOpenRouterFn = (
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  config?: GlobalConfig,
) => Promise<string>;

let _callOpenRouter: CallOpenRouterFn | null = null;

export function setCallOpenRouter(fn: CallOpenRouterFn | null): void {
  _callOpenRouter = fn;
}

export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  config?: GlobalConfig,
): Promise<string> {
  if (_callOpenRouter) {
    return _callOpenRouter(systemPrompt, userPrompt, model, config);
  }

  const resolvedConfig = config ?? await readGlobalConfig();
  if (!resolvedConfig.openrouterApiKey) {
    throw new Error(
      'No OpenRouter API key configured.\n' +
      'Get one at https://openrouter.ai/keys\n' +
      'Then run: limn settings set openrouterApiKey <your-key>',
    );
  }

  const openai = getClient(resolvedConfig.openrouterApiKey);
  const response = await openai.chat.completions.create({
    model: model ?? resolvedConfig.openrouterModel ?? 'deepseek/deepseek-v4-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content?.trim() ?? '';
}