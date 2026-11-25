import { decodeJwtPayload, isJwtExpired } from '@/utils/jwt';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64UrlUtf8(input: string): string {
  const utf8 = encodeURIComponent(input).replace(
    /%([0-9A-F]{2})/g,
    (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  );
  let output = '';
  for (let i = 0; i < utf8.length; i += 3) {
    const c1 = utf8.charCodeAt(i);
    const has2 = i + 1 < utf8.length;
    const has3 = i + 2 < utf8.length;
    const c2 = has2 ? utf8.charCodeAt(i + 1) : 0;
    const c3 = has3 ? utf8.charCodeAt(i + 2) : 0;

    output += B64.charAt(c1 >> 2);
    output += B64.charAt(((c1 & 3) << 4) | (c2 >> 4));
    if (has2) output += B64.charAt(((c2 & 15) << 2) | (c3 >> 6));
    if (has3) output += B64.charAt(c3 & 63);
  }
  return output.replace(/\+/g, '-').replace(/\//g, '_');
}

function makeToken(payload: Record<string, unknown>): string {
  const header = encodeBase64UrlUtf8(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  );
  const body = encodeBase64UrlUtf8(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('jwt utilities (Hermes-safe Base64Url)', () => {
  it('decodes UTF-8 payloads accurately without relying on window.atob', () => {
    const token = makeToken({
      sub: 'user-123',
      email: 'sofía@deliverypro.co',
      role: 'CLIENT',
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const decoded = decodeJwtPayload(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('user-123');
    expect(decoded?.email).toBe('sofía@deliverypro.co');
    expect(decoded?.role).toBe('CLIENT');
    expect(isJwtExpired(token)).toBe(false);
  });

  it('detects expired tokens and rejects malformed strings', () => {
    const expired = makeToken({
      sub: 'user-999',
      email: 'rider@deliverypro.co',
      role: 'DELIVERY',
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    expect(isJwtExpired(expired)).toBe(true);
    expect(decodeJwtPayload('not-a-valid-jwt')).toBeNull();
  });
});
