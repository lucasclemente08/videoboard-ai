/**
 * JWT implementation using Node's built-in crypto (HMAC-SHA256).
 * No external dependencies needed.
 */
import * as crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'videoboard-dev-secret-change-in-production';
const EXPIRY = '7d'; // 7 days in seconds

function toBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

function getExpiryTimestamp(): number {
  // Parse EXPIRY like "7d", "24h", "30m"
  const match = EXPIRY.match(/^(\d+)([dhms])$/);
  if (!match) return Math.floor(Date.now() / 1000) + 7 * 86400;
  const num = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { d: 86400, h: 3600, m: 60, s: 1 };
  return Math.floor(Date.now() / 1000) + num * (multipliers[unit] || 86400);
}

export function signToken(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: getExpiryTimestamp() };

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signatureB64 !== expectedSig) return null;

    const payload = JSON.parse(fromBase64Url(payloadB64));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}
