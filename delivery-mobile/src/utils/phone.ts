export const PHONE_REGEX = /^\+?[\d\s()-]{10,20}$/;

export function validatePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'El número de celular es obligatorio.';
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return 'Ingresa un número de celular válido (ej. 300 123 4567).';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'El número de celular debe tener entre 10 y 15 dígitos.';
  }
  return null;
}

export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim().replace(/[\s()-]/g, '');
  const coMatch = cleaned.match(/^\+57(3\d{2})(\d{3})(\d{4})$/);
  if (coMatch) {
    return `+57 ${coMatch[1]} ${coMatch[2]} ${coMatch[3]}`;
  }
  return phone.trim();
}
