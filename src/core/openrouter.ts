import OpenAI from 'openai';
import type { GlobalConfig, OpenRouterFullResult } from '../types.js';
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

export async function callOpenRouterFull(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  config?: GlobalConfig,
): Promise<OpenRouterFullResult> {
  const resolvedConfig = config ?? await readGlobalConfig();
  if (!resolvedConfig.openrouterApiKey) {
    throw new Error(
      'No OpenRouter API key configured.\n' +
      'Get one at https://openrouter.ai/keys\n' +
      'Then run: limn settings set openrouterApiKey <your-key>',
    );
  }

  const openai = getClient(resolvedConfig.openrouterApiKey);
  const startMs = Date.now();
  const response = await openai.chat.completions.create({
    model: model ?? resolvedConfig.openrouterModel ?? 'deepseek/deepseek-v4-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });
  const durationMs = Date.now() - startMs;

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  const usage = response.usage;

  // OpenRouter may include cost in usage (non-standard extension)
  const usageAny = usage as Record<string, unknown> | undefined;
  const costRaw = usageAny?.['cost'];
  const costUsd = typeof costRaw === 'number' ? costRaw : null;

  return {
    text,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
      costUsd,
      generationId: response.id ?? null,
    },
    durationMs,
  };
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

  const result = await callOpenRouterFull(systemPrompt, userPrompt, model, config);
  return result.text;
}
