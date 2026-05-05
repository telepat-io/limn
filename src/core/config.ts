import envPaths from 'env-paths';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { loadSecrets, saveSecrets, type SecretStoreOptions } from './secretStore.js';
import type { GlobalConfig } from '../types.js';

const paths = envPaths('limn', { suffix: '' });
const globalConfigFile = path.join(paths.config, 'config.json');

const globalConfigSchema = z.object({
  openrouterModel: z.string().min(1).optional(),
});

function readDisableKeytarEnv(): boolean {
  const value = process.env['LIMN_DISABLE_KEYTAR'];
  return value?.trim().toLowerCase() === 'true';
}

async function readGlobalNonSecretConfig(): Promise<z.infer<typeof globalConfigSchema>> {
  try {
    const raw = await fs.readFile(globalConfigFile, 'utf-8');
    return globalConfigSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function readGlobalConfig(): Promise<GlobalConfig> {
  const secretOptions: SecretStoreOptions = { disableKeytar: readDisableKeytarEnv() };
  const [fileConfig, secrets] = await Promise.all([readGlobalNonSecretConfig(), loadSecrets(secretOptions)]);

  return {
    openrouterApiKey: process.env['OPENROUTER_API_KEY'] ?? secrets.openrouterApiKey ?? undefined,
    openrouterModel: fileConfig.openrouterModel,
    replicateApiKey:
      process.env['REPLICATE_API_TOKEN'] ??
      process.env['REPLICATE_API_KEY'] ??
      secrets.replicateApiKey ??
      undefined,
  };
}

async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  const nonSecret = globalConfigSchema.parse({
    openrouterModel: config.openrouterModel,
  });

  await fs.mkdir(paths.config, { recursive: true });
  await fs.writeFile(globalConfigFile, `${JSON.stringify(nonSecret, null, 2)}\n`);

  await saveSecrets(
    {
      openrouterApiKey: config.openrouterApiKey ?? null,
      replicateApiKey: config.replicateApiKey ?? null,
    },
    { disableKeytar: readDisableKeytarEnv() },
  );
}

const SECRET_KEYS = new Set(['openrouterApiKey', 'replicateApiKey']);
const ALL_KEYS = new Set(['openrouterApiKey', 'openrouterModel', 'replicateApiKey']);

export async function setGlobalSetting(key: string, value: string): Promise<void> {
  if (key === 'openrouterApiKey') {
    await saveSecrets({ openrouterApiKey: value }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'replicateApiKey') {
    await saveSecrets({ replicateApiKey: value }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'openrouterModel') {
    const current = await readGlobalConfig();
    await writeGlobalConfig({ ...current, openrouterModel: value });
    return;
  }

  throw new Error(`Unknown global key: ${key}`);
}

export async function unsetGlobalSetting(key: string): Promise<void> {
  if (key === 'openrouterApiKey') {
    await saveSecrets({ openrouterApiKey: null }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'replicateApiKey') {
    await saveSecrets({ replicateApiKey: null }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'openrouterModel') {
    const current = await readGlobalConfig();
    await writeGlobalConfig({ ...current, openrouterModel: undefined });
    return;
  }

  throw new Error(`Unknown global key: ${key}`);
}

export function isValidSettingKey(key: string): boolean {
  return ALL_KEYS.has(key);
}

export function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key);
}

export function redactValue(key: string, value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (!SECRET_KEYS.has(key)) {
    return value;
  }

  return '***configured***';
}