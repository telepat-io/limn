import { Command } from 'commander';
import { readGlobalConfig, setGlobalSetting, unsetGlobalSetting, isValidSettingKey, isSecretKey, redactValue } from '../core/config.js';
import { KeytarUnavailableError } from '../core/secretStore.js';

export function settingsCommand(): Command {
  const cmd = new Command('settings');

  cmd
    .description('Manage limn configuration');

  cmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      try {
        if (!isValidSettingKey(key)) {
          console.error(`Unknown setting key: ${key}. Valid keys: openrouterApiKey, openrouterModel`);
          process.exit(1);
        }
        await setGlobalSetting(key, value);
        console.log(`Set ${key}.`);
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key: string) => {
      try {
        if (!isValidSettingKey(key)) {
          console.error(`Unknown setting key: ${key}. Valid keys: openrouterApiKey, openrouterModel`);
          process.exit(1);
        }
        const config = await readGlobalConfig();
        const value = config[key as keyof typeof config];
        const display = isSecretKey(key) ? redactValue(key, value) : value;
        console.log(display ?? 'not set');
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('list')
    .description('List all configuration values')
    .action(async () => {
      try {
        const config = await readGlobalConfig();
        console.log(JSON.stringify({
          openrouterApiKey: redactValue('openrouterApiKey', config.openrouterApiKey),
          openrouterModel: config.openrouterModel ?? 'not set',
        }, null, 2));
      } catch (error) {
        handleError(error);
      }
    });

  cmd
    .command('unset <key>')
    .description('Remove a configuration value')
    .action(async (key: string) => {
      try {
        if (!isValidSettingKey(key)) {
          console.error(`Unknown setting key: ${key}. Valid keys: openrouterApiKey, openrouterModel`);
          process.exit(1);
        }
        await unsetGlobalSetting(key);
        console.log(`Unset ${key}.`);
      } catch (error) {
        handleError(error);
      }
    });

  return cmd;
}

function handleError(error: unknown): never {
  if (error instanceof KeytarUnavailableError) {
    console.error(error.message);
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }

  console.error('Unknown error');
  process.exit(1);
}