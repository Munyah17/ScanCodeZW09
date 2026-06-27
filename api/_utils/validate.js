/**
 * Lightweight input validation utilities (Rule 4 — "Zod or equivalent").
 * Used by API handlers to validate fields before hitting the database.
 */

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_STR  = /^[a-zA-Z0-9_\- ]+$/; // alphanumeric + underscore/hyphen/space

export function isValidEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

export function isValidUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function isValidLength(v, min, max) {
  if (typeof v !== 'string') return false;
  const len = v.trim().length;
  return len >= min && len <= max;
}

export function isStrongPassword(v) {
  return typeof v === 'string' && v.length >= 8;
}

export function isUsername(v) {
  return typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 50 && SAFE_STR.test(v.trim());
}

/**
 * Run a list of checks. Returns first failure message or null if all pass.
 * @param {Array<{check: boolean, msg: string}>} rules
 * @returns {string|null}
 */
export function firstError(rules) {
  for (const { check, msg } of rules) {
    if (!check) return msg;
  }
  return null;
}
