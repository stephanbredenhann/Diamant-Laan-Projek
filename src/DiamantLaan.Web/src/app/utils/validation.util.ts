import { ALL_COUNTRY_CODES } from '../data/country-codes';

export interface PasswordChecks {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasUpper: boolean;
  hasLower: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
  };
}

export function validatePassword(password: string): string | null {
  const c = getPasswordChecks(password);
  if (!c.minLength) return 'Wagwoord moet minstens 8 karakters lank wees.';
  if (!c.hasNumber) return "Wagwoord moet 'n nommer bevat.";
  if (!c.hasSpecial) return "Wagwoord moet 'n spesiale karakter bevat.";
  if (!c.hasUpper) return "Wagwoord moet 'n hoofletter bevat.";
  if (!c.hasLower) return "Wagwoord moet 'n kleinletter bevat.";
  return null;
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password) === null;
}

export const COUNTRY_CODES = ALL_COUNTRY_CODES;

const DEFAULT_MIN_LOCAL_LENGTH = 4;
const DEFAULT_MAX_LOCAL_LENGTH = 15;
const MAX_E164_DIGITS = 15;

/**
 * Validates a local phone number for the given country dialling code.
 * Empty input is treated as optional (returns null). Numbers are stripped
 * of all non-digit characters before validation.
 */
export function validatePhone(localNumber: string, countryCode: string): string | null {
  if (!localNumber.trim()) return null;
  const digits = localNumber.replace(/\D/g, '');
  const code = (countryCode || '+27').trim();

  if (code === '+27') {
    if (digits.startsWith('0')) {
      return digits.length === 10
        ? null
        : "Foonnommer moet 9 syfers wees sonder 'n voorafgaande nul, of 10 syfers met een.";
    }
    if (digits.length === 9) return null;
    return "Foonnommer moet 9 syfers wees sonder 'n voorafgaande nul, of 10 syfers met een.";
  }

  const countryDigits = code.replace(/\D/g, '');
  const entry = COUNTRY_CODES.find((c) => c.code === code);
  const localDigits = digits.startsWith('0') && digits.length > 1 ? digits.slice(1) : digits;
  const min = entry?.minLength ?? DEFAULT_MIN_LOCAL_LENGTH;
  const max = entry?.maxLength ?? DEFAULT_MAX_LOCAL_LENGTH;

  if (localDigits.length < min || localDigits.length > max) {
    return min === max
      ? `Foonnommer moet ${min} syfers wees.`
      : `Foonnommer moet tussen ${min} en ${max} syfers wees.`;
  }

  if (countryDigits.length + localDigits.length > MAX_E164_DIGITS) {
    return 'Foonnommer is te lank vir hierdie landkode.';
  }

  return null;
}

/** 9 digits without leading 0, or 10 with leading 0. Returns error or null. */
export function validateSaPhone(localNumber: string): string | null {
  return validatePhone(localNumber, '+27');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Voer 'n geldige e-posadres in.";
  if (trimmed.length > 254) return "Voer 'n geldige e-posadres in.";
  if ((trimmed.match(/@/g) || []).length !== 1) return "Voer 'n geldige e-posadres in.";

  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) return "Voer 'n geldige e-posadres in.";
  if (!domain.includes('.')) return "Voer 'n geldige e-posadres in.";
  if (!EMAIL_REGEX.test(trimmed)) return "Voer 'n geldige e-posadres in.";

  return null;
}
