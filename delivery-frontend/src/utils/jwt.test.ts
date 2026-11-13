import { describe, expect, it, vi, afterEach } from 'vitest';
import { decodeJwtPayload, isJwtExpired } from '@/utils/jwt';

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.signature`;
}

describe('jwt utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('decodes a valid base64url JWT payload cleanly', () => {
    const token = makeToken({
      sub: 'user-123',
      email: 'mateo@delivery.com',
      role: 'CLIENT',
      exp: 1900000000,
    });

    const decoded = decodeJwtPayload(token);

    expect(decoded).toEqual({
      sub: 'user-123',
      email: 'mateo@delivery.com',
      role: 'CLIENT',
      exp: 1900000000,
    });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('only.two')).toBeNull();
    expect(decodeJwtPayload('a.!!!invalid-base64!!!.c')).toBeNull();
  });

  it('detects expired vs non-expired tokens accurately', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    const nowSeconds = Math.floor(Date.now() / 1000);

    const validToken = makeToken({
      sub: 'u1',
      email: 'a@b.com',
      role: 'CLIENT',
      exp: nowSeconds + 300,
    });
    const expiredToken = makeToken({
      sub: 'u1',
      email: 'a@b.com',
      role: 'CLIENT',
      exp: nowSeconds - 10,
    });
    const noExpToken = makeToken({
      sub: 'u1',
      email: 'a@b.com',
      role: 'CLIENT',
    });

    expect(isJwtExpired(validToken)).toBe(false);
    expect(isJwtExpired(expiredToken)).toBe(true);
    expect(isJwtExpired(noExpToken)).toBe(false);
  });
});
