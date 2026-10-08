export const SITE_CSP_MAX_SCRIPT_HASHES = 100;
export const SITE_CSP_MAX_LENGTH = 16_384;
export const SITE_CSP_MAX_ALLOWED_ORIGINS = 32;

export const SITE_CSP_STATIC_DIRECTIVES = [
  "object-src 'none'",
  "base-uri 'self'",
] as const;
