export const COMPANY_LOGO_DEBOUNCE_MS = 500;

export const COMPANY_LOGO_STALE_TIME_MS = 300_000;

/** Allows logo-heavy GEO pages while capping uncached lookups across all queries per user. */
export const COMPANY_LOGO_RATE_LIMIT_PER_USER_PER_MINUTE = 60;

export const COMPANY_LOGO_SOURCE_HOSTS = ["media.brand.dev"] as const;

export const COMPANY_LOGO_FETCH_TIMEOUT_MS = 10_000;

/** The brand lookup sits in the dashboard RPC batch, so a slow upstream must not hold the batch. */
export const COMPANY_LOGO_LOOKUP_TIMEOUT_MS = 2500;
