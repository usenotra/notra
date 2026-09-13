export const MAX_ATTEMPTS = 8;
export const LEASE_SECONDS = 60;
export const HTTP_TIMEOUT_MS = 10_000;
export const RECOVERY_BATCH_SIZE = 100;
export const RETENTION_DAYS = 30;
export const SIGNATURE_TOLERANCE_SECONDS = 300;
export const PAGE_SIZE = 25;
export const MAX_PAYLOAD_BYTES = 65_536;
export const API_VERSION = "2026-09-01";
export const RETRY_DELAYS_SECONDS: readonly number[] = [
  30, 120, 600, 1800, 3600, 10800, 21600,
];
