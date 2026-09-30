export const COMPANY_LOGO_DEBOUNCE_MS = 500;

export const COMPANY_LOGO_STALE_TIME_MS = 300_000;

/** Bounds repeated fetches for one domain or brand name without pooling unrelated lookups. */
export const COMPANY_LOGO_RATE_LIMIT_PER_QUERY_PER_MINUTE = 5;

export const COMPANY_LOGO_SOURCE_HOSTS = ["media.brand.dev"] as const;

export const COMPANY_LOGO_FETCH_TIMEOUT_MS = 10_000;

/** The brand lookup sits in the dashboard RPC batch, so a slow upstream must not hold the batch. */
export const COMPANY_LOGO_LOOKUP_TIMEOUT_MS = 2500;
