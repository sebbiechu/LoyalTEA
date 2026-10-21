// Card codes: 11 random Crockford base32 characters + 1 check character (≈55 bits).
// Shown to people as XXXX-XXXX-XXXX. Safe to use on client and server.

export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DATA_LEN = 11;

function checkChar(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += (i + 1) * ALPHABET.indexOf(data[i]);
  return ALPHABET[sum % 32];
}

export function generateCode(): string {
  const bytes = new Uint8Array(DATA_LEN);
  crypto.getRandomValues(bytes);
  const data = Array.from(bytes, (b) => ALPHABET[b & 31]).join("");
  return data + checkChar(data);
}

/** Cleans up typed or scanned input. Returns a valid 12-char code or null. */
export function normaliseCode(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  // Accept a full card URL as well as the bare code
  const m = s.match(/[?&#]card=([^&#\s]+)/i);
  if (m) s = decodeURIComponent(m[1]);
  s = s
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (s.length !== 12) return null;
  if ([...s].some((c) => !ALPHABET.includes(c))) return null;
  const data = s.slice(0, DATA_LEN);
  return checkChar(data) === s[DATA_LEN] ? s : null;
}

export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}
