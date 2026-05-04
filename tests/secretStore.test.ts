import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { KeytarUnavailableError } from '../src/core/secretStore.js';

describe('secretStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['LIMN_DISABLE_KEYTAR'];
  });

  describe('loadSecrets', () => {
    it('should return null secrets when keytar is disabled', async () => {
      process.env['LIMN_DISABLE_KEYTAR'] = 'true';
      const { loadSecrets } = await import('../src/core/secretStore.js');
      const secrets = await loadSecrets({ disableKeytar: true });
      expect(secrets.openrouterApiKey).toBeNull();
    });

    it('should return null secrets by default with disableKeytar', async () => {
      const { loadSecrets } = await import('../src/core/secretStore.js');
      const secrets = await loadSecrets({ disableKeytar: true });
      expect(secrets).toEqual({ openrouterApiKey: null });
    });
  });

  describe('saveSecrets', () => {
    it('should throw KeytarUnavailableError when keytar is disabled', async () => {
      const { saveSecrets } = await import('../src/core/secretStore.js');
      await expect(saveSecrets({ openrouterApiKey: 'test' }, { disableKeytar: true })).rejects.toThrow(KeytarUnavailableError);
    });
  });

  describe('KeytarUnavailableError', () => {
    it('should have correct name property', () => {
      const error = new KeytarUnavailableError('test');
      expect(error.name).toBe('KeytarUnavailableError');
      expect(error.message).toBe('test');
    });
  });
});