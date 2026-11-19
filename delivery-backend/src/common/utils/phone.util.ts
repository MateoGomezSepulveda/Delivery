export const PHONE_VALIDATION_REGEX = /^\+?[\d\s()-]{10,20}$/;

/**
 * Normaliza un número de celular a formato E.164 (ej. +573001234567).
 * - Si tiene 10 dígitos comenzando en 3 (celular colombiano estándar), antepone +57.
 * - Si tiene 10-15 dígitos con prefijo '+', lo conserva sin espacios ni guiones.
 * - Si tiene 10-15 dígitos sin '+', antepone '+'.
 * - Retorna null si no cumple con un formato telefónico válido.
 */
export function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed || !PHONE_VALIDATION_REGEX.test(trimmed)) {
    return null;
  }

  const cleaned = trimmed.replace(/[\s()-]/g, '');

  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^3\d{9}$/.test(cleaned)) {
    return `+57${cleaned}`;
  }

  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}
