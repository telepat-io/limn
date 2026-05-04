const SERVICE_NAME = 'limn';
const OPENROUTER_ACCOUNT = 'openrouter-api-key';

const KEYTAR_UNAVAILABLE_ERROR_NAME = 'KeytarUnavailableError';

let hasWarnedAboutUnavailableKeytar = false;
let keytarPromise: Promise<KeytarLike | null> | null = null;

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface SecretStoreOptions {
  disableKeytar?: boolean;
}

export interface SecretSettings {
  openrouterApiKey: string | null;
}

export class KeytarUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = KEYTAR_UNAVAILABLE_ERROR_NAME;
  }
}

function nullSecrets(): SecretSettings {
  return { openrouterApiKey: null };
}

function shouldDisableKeytar(options: SecretStoreOptions): boolean {
  return options.disableKeytar === true;
}

function isKeytarLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const lowered = error.message.toLowerCase();
  return lowered.includes('libsecret')
    || lowered.includes('cannot open shared object file')
    || lowered.includes('module did not self-register')
    || lowered.includes('cannot find module')
    || lowered.includes('keytar');
}

function isKeytarAvailabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const lowered = error.message.toLowerCase();
  return [
    'dbus',
    'd-bus',
    'org.freedesktop.secrets',
    'secret service',
    'secret-service',
    'keychain',
    'keyring',
    'credential store',
    'credentials were unavailable',
    'cannot autolaunch',
    'no such interface',
    'not supported in this environment',
    'libsecret',
    'cannot open shared object file',
  ].some((fragment) => lowered.includes(fragment));
}

async function loadKeytar(): Promise<KeytarLike | null> {
  if (!keytarPromise) {
    keytarPromise = import('keytar')
      .then((module) => module.default as KeytarLike)
      .catch((error: unknown) => {
        if (isKeytarLoadError(error)) {
          const message = error instanceof Error ? error.message : 'unknown error';
          warnKeytarUnavailable(message);
          return null;
        }

        throw error;
      });
  }

  return keytarPromise;
}

function warnKeytarUnavailable(details: string): void {
  if (hasWarnedAboutUnavailableKeytar) {
    return;
  }

  hasWarnedAboutUnavailableKeytar = true;
  console.warn(
    `System keychain unavailable (${details}). Falling back to environment variables for secrets. Set LIMN_DISABLE_KEYTAR=true to skip keychain access in this environment.`,
  );
}

export async function loadSecrets(options: SecretStoreOptions = {}): Promise<SecretSettings> {
  if (shouldDisableKeytar(options)) {
    return nullSecrets();
  }

  const keytar = await loadKeytar();
  if (!keytar) {
    return nullSecrets();
  }

  try {
    const openrouterApiKey = await keytar.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT);
    return { openrouterApiKey };
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = error instanceof Error ? error.message : 'unknown error';
      warnKeytarUnavailable(message);
      return nullSecrets();
    }

    throw error;
  }
}

export async function saveSecrets(secrets: Partial<SecretSettings>, options: SecretStoreOptions = {}): Promise<void> {
  if (shouldDisableKeytar(options)) {
    throw new KeytarUnavailableError(
      'System keychain access is disabled by LIMN_DISABLE_KEYTAR=true. Use OPENROUTER_API_KEY instead.',
    );
  }

  const keytar = await loadKeytar();
  if (!keytar) {
    throw new KeytarUnavailableError(
      'System keychain unavailable while saving credentials. Use OPENROUTER_API_KEY instead.',
    );
  }

  if (secrets.openrouterApiKey !== undefined) {
    await saveSecretValue(keytar, OPENROUTER_ACCOUNT, secrets.openrouterApiKey);
  }
}

async function saveSecretValue(keytar: KeytarLike, account: string, value: string | null): Promise<void> {
  try {
    if (!value) {
      await keytar.deletePassword(SERVICE_NAME, account);
      return;
    }

    await keytar.setPassword(SERVICE_NAME, account, value);
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new KeytarUnavailableError(
        `System keychain unavailable while saving credentials (${message}). Use OPENROUTER_API_KEY instead.`,
      );
    }

    throw error;
  }
}