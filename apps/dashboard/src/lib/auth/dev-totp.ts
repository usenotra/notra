/**
 * RFC 6238 TOTP helpers backed by WebCrypto. Only used by the dev-only auth
 * playground so the whole flow can be exercised without a real WorkOS factor.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_BITS_PER_CHAR = 5;
const BYTE_BITS = 8;
const BYTE_MASK = 0xff;
const SECRET_BYTES = 20;
const COUNTER_BYTES = 8;
const TRUNCATION_MASK = 0x0f;
const HOTP_MODULUS = 10 ** 6;
const TOTP_STEP_SECONDS = 30;
const MS_PER_SECOND = 1000;
const NON_BASE32_REGEX = /[^A-Z2-7]/g;

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << BYTE_BITS) | byte;
    bits += BYTE_BITS;
    while (bits >= BASE32_BITS_PER_CHAR) {
      output +=
        BASE32_ALPHABET[(value >>> (bits - BASE32_BITS_PER_CHAR)) & 0x1f];
      bits -= BASE32_BITS_PER_CHAR;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (BASE32_BITS_PER_CHAR - bits)) & 0x1f];
  }
  return output;
}

function base32Decode(secret: string): Uint8Array<ArrayBuffer> {
  const normalized = secret.toUpperCase().replace(NON_BASE32_REGEX, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of normalized) {
    value = (value << BASE32_BITS_PER_CHAR) | BASE32_ALPHABET.indexOf(char);
    bits += BASE32_BITS_PER_CHAR;
    if (bits >= BYTE_BITS) {
      bytes.push((value >>> (bits - BYTE_BITS)) & BYTE_MASK);
      bits -= BYTE_BITS;
    }
  }
  const output = new Uint8Array(new ArrayBuffer(bytes.length));
  output.set(bytes);
  return output;
}

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

export function buildOtpauthUri(
  secret: string,
  issuer: string,
  account: string
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const counterBytes = new Uint8Array(COUNTER_BYTES);
  let remaining = counter;
  for (let index = COUNTER_BYTES - 1; index >= 0; index -= 1) {
    counterBytes[index] = remaining & BYTE_MASK;
    remaining = Math.floor(remaining / (BYTE_MASK + 1));
  }
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counterBytes)
  );
  const offset = (digest.at(-1) ?? 0) & TRUNCATION_MASK;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & BYTE_MASK) << 16) |
    (((digest[offset + 2] ?? 0) & BYTE_MASK) << 8) |
    ((digest[offset + 3] ?? 0) & BYTE_MASK);
  return String(binary % HOTP_MODULUS).padStart(6, "0");
}

function totpCounter(timestampMs = Date.now()): number {
  return Math.floor(timestampMs / MS_PER_SECOND / TOTP_STEP_SECONDS);
}

export function secondsUntilNextTotp(timestampMs = Date.now()): number {
  const elapsed = Math.floor(timestampMs / MS_PER_SECOND) % TOTP_STEP_SECONDS;
  return TOTP_STEP_SECONDS - elapsed;
}

export function generateTotpCode(
  secret: string,
  timestampMs = Date.now()
): Promise<string> {
  return hotp(secret, totpCounter(timestampMs));
}

export async function verifyTotpCode(
  secret: string,
  code: string,
  window = 1
): Promise<boolean> {
  const counter = totpCounter();
  for (let delta = -window; delta <= window; delta += 1) {
    if ((await hotp(secret, counter + delta)) === code) {
      return true;
    }
  }
  return false;
}
