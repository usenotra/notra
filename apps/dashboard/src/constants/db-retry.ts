export const TRANSIENT_DB_MESSAGES = ["Control plane request failed"];
export const TRANSIENT_DB_CODES = new Set(["XX000", "UND_ERR_DESTROYED"]);
export const TRANSIENT_DB_RETRY_DELAYS_MS = [250, 750, 1500];
