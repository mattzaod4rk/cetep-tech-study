/**
 * Crypto utilities using the native Web Crypto API.
 * No external dependencies needed.
 */

/**
 * Hashes a password using SHA-256 via Web Crypto API.
 * @param {string} password - The plain text password.
 * @returns {Promise<string>} - Hex-encoded hash string.
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a plain text password against a stored hash.
 * @param {string} password - The plain text password to check.
 * @param {string} storedHash - The previously stored SHA-256 hash.
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash;
}
