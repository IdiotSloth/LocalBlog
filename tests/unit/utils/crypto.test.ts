import { describe, expect, it } from 'vitest';
import { generateToken, hashPassword, verifyPassword } from '../../../src/main/utils/crypto';

describe('crypto', () => {
  describe('hashPassword', () => {
    it('should return a string with salt:hash format', () => {
      const result = hashPassword('test1234');
      expect(result).toContain(':');
      const [salt, hash] = result.split(':');
      expect(salt).toHaveLength(32); // 16 bytes hex
      expect(hash).toHaveLength(128); // 64 bytes hex
    });

    it('should produce different hashes for the same password', () => {
      const h1 = hashPassword('test1234');
      const h2 = hashPassword('test1234');
      expect(h1).not.toBe(h2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const hash = hashPassword('test1234');
      expect(verifyPassword('test1234', hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const hash = hashPassword('test1234');
      expect(verifyPassword('wrong', hash)).toBe(false);
    });

    it('should reject invalid hash format', () => {
      expect(verifyPassword('test', 'invalid_hash')).toBe(false);
      expect(verifyPassword('test', '')).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should return a base64url string of 64 chars', () => {
      const token = generateToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 48 bytes base64url
    });

    it('should generate unique tokens', () => {
      const t1 = generateToken();
      const t2 = generateToken();
      expect(t1).not.toBe(t2);
    });
  });
});
