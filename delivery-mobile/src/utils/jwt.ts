import type { JwtPayload } from '@/types/auth.types';

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function decodeBase64Utf8(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(clean.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const enc3 = BASE64_CHARS.indexOf(clean.charAt(i + 2));
    const enc4 = BASE64_CHARS.indexOf(clean.charAt(i + 3));

    if (enc1 < 0 || enc2 < 0) break;

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    bytes.push(chr1);

    if (enc3 !== 64 && enc3 >= 0) {
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      bytes.push(chr2);
    }
    if (enc4 !== 64 && enc4 >= 0) {
      const chr3 = ((enc3 & 3) << 6) | enc4;
      bytes.push(chr3);
    }
  }

  const percentEncoded = bytes
    .map((b) => '%' + ('00' + b.toString(16)).slice(-2))
    .join('');

  return decodeURIComponent(percentEncoded);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );

    const jsonPayload = decodeBase64Utf8(padded);
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds;
}
