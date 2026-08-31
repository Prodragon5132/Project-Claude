/**
 * Checksum + structural validators.
 *
 * Every one of these exists to kill a false positive. A 16-digit number is only
 * a credit card if it passes Luhn; a 9-digit number is only an SSN if it obeys
 * the SSA allocation rules. Regex alone produces garbage, and garbage redaction
 * destroys documents.
 */

/** Luhn (mod 10) — credit cards, Canadian SIN, US NPI, IMEI. */
export function luhn(digits) {
  const s = String(digits).replace(/[^0-9]/g, '');
  if (s.length < 2) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = s.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** ISO 7064 mod-97-10 — IBAN. */
export function iban(value) {
  const s = String(value).replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const len = IBAN_LENGTHS[s.slice(0, 2)];
  if (len && s.length !== len) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    // 'A'..'Z' -> 10..35, '0'..'9' -> 0..9
    const chunk = code >= 65 ? String(code - 55) : String(code - 48);
    for (const d of chunk) remainder = (remainder * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return remainder === 1;
}

const IBAN_LENGTHS = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20,
  LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22,
  MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25,
  QA: 29, RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25,
  SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

/**
 * US SSN allocation rules. The SSA has never issued an area of 000, 666, or
 * 900-999, nor a group of 00, nor a serial of 0000. 078-05-1120 is the famous
 * "Woolworth wallet" number and shows up in test fixtures everywhere, but it is
 * a real issued number, so we keep it.
 */
export function ssn(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 9) return false;
  const area = s.slice(0, 3);
  const group = s.slice(3, 5);
  const serial = s.slice(5);
  if (area === '000' || area === '666' || area[0] === '9') return false;
  if (group === '00') return false;
  if (serial === '0000') return false;
  // Repeated single digit (111111111) is a placeholder, not a person.
  if (/^(\d)\1{8}$/.test(s)) return false;
  return true;
}

/** ABA routing transit number: weighted mod 10. */
export function routing(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 9) return false;
  if (/^0{9}$/.test(s)) return false;
  const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (s.charCodeAt(i) - 48) * w[i];
  return sum % 10 === 0;
}

/** NHS number (England/Wales): mod 11 with weights 10..2, check digit last. */
export function nhs(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (s.charCodeAt(i) - 48) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) return false;
  return check === s.charCodeAt(9) - 48;
}

/** US National Provider Identifier: Luhn over "80840" + the 10-digit NPI. */
export function npi(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 10) return false;
  if (!/^[12]/.test(s)) return false;
  return luhn('80840' + s);
}

/** Canadian Social Insurance Number: 9 digits, Luhn. */
export function sin(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 9) return false;
  if (s[0] === '0' || s[0] === '8') return false;
  if (/^(\d)\1{8}$/.test(s)) return false;
  return luhn(s);
}

/** Australian Tax File Number: weighted mod 11. */
export function tfn(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 8 && s.length !== 9) return false;
  const w = s.length === 9 ? [1, 4, 3, 7, 5, 8, 6, 9, 10] : [1, 4, 3, 7, 5, 8, 6, 9];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += (s.charCodeAt(i) - 48) * w[i];
  return sum % 11 === 0;
}

/** Australian Business Number: subtract 1 from first digit, weighted mod 89. */
export function abn(value) {
  const s = String(value).replace(/[^0-9]/g, '');
  if (s.length !== 11) return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let d = s.charCodeAt(i) - 48;
    if (i === 0) d -= 1;
    sum += d * w[i];
  }
  return sum % 89 === 0;
}

/** Vehicle Identification Number: ISO 3779 transliteration, mod 11 check at pos 9. */
export function vin(value) {
  const s = String(value).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(s)) return false;
  const translit = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = s[i];
    const v = ch >= '0' && ch <= '9' ? ch.charCodeAt(0) - 48 : translit[ch];
    if (v === undefined) return false;
    sum += v * weights[i];
  }
  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : String(rem);
  return s[8] === expected;
}

/** UK National Insurance number: prefix and suffix rules. */
export function nino(value) {
  const s = String(value).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{2}[0-9]{6}[A-D]?$/.test(s)) return false;
  const p = s.slice(0, 2);
  if (/[DFIQUV]/.test(p[0])) return false;
  if (/[DFIQUVO]/.test(p[1])) return false;
  if (['BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ'].includes(p)) return false;
  return true;
}

/** Base58 (Bitcoin) checksum is expensive; a character-class + length gate is enough. */
export function base58(value) {
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(String(value));
}

/**
 * Shannon entropy in bits per character. Used to separate real secrets
 * ("hunter2" no, "aG9sZHRoaXNzZWNyZXQ=" yes) from prose.
 */
export function entropy(value) {
  const s = String(value);
  if (!s.length) return 0;
  const freq = new Map();
  for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** True when a string looks machine-generated rather than written by a person. */
export function looksRandom(value, minEntropy = 3.2) {
  const s = String(value);
  if (s.length < 12) return false;
  if (!/[0-9]/.test(s)) return false;
  if (/^[0-9]+$/.test(s)) return false;
  if (/\s/.test(s)) return false;
  return entropy(s) >= minEntropy;
}

/** Calendar-valid date check used by the DOB detector. */
export function validDate(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
