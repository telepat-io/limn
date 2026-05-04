import { describe, it, expect } from '@jest/globals';
import { isValidSettingKey, isSecretKey, redactValue } from '../src/core/config.js';

describe('config', () => {
  describe('isValidSettingKey', () => {
    it('should return true for valid keys', () => {
      expect(isValidSettingKey('openrouterApiKey')).toBe(true);
      expect(isValidSettingKey('openrouterModel')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isValidSettingKey('unknown')).toBe(false);
      expect(isValidSettingKey('')).toBe(false);
    });
  });

  describe('isSecretKey', () => {
    it('should return true for secret keys', () => {
      expect(isSecretKey('openrouterApiKey')).toBe(true);
    });

    it('should return false for non-secret keys', () => {
      expect(isSecretKey('openrouterModel')).toBe(false);
    });
  });

  describe('redactValue', () => {
    it('should redact secret values', () => {
      expect(redactValue('openrouterApiKey', 'sk-test')).toBe('***configured***');
    });

    it('should not redact non-secret values', () => {
      expect(redactValue('openrouterModel', 'deepseek/deepseek-v4-pro')).toBe('deepseek/deepseek-v4-pro');
    });

    it('should return undefined/null as-is', () => {
      expect(redactValue('openrouterApiKey', undefined)).toBeUndefined();
      expect(redactValue('openrouterApiKey', null)).toBeNull();
    });
  });
});