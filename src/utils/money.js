// Functions to convert between integer cents and decimal strings

/**
 * Convert a float amount to integer cents.
 * @param {number} amount - amount in GKC
 */
export function toCents(amount) {
  return Math.round(amount * 100);
}

/**
 * Convert integer cents to formatted string with 2 decimals.
 * @param {number} cents - amount in cents
 */
export function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

/**
 * Convert integer cents to a string with units (e.g. 1 234,56 GKC).
 * @deprecated use formatCents instead.
 */
export function toCentsString(cents) {
  return formatCents(cents);
}