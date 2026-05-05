import crypto from 'node:crypto';

const TOKEN_BYTES = 48;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length < 2) return false;
  const salt = parts[0];
  const hash = parts.slice(1).join(':');
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return computed === hash;
}

export function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}
