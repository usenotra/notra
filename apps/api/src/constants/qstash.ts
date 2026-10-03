export const QSTASH_REQUEST_TIMEOUT_MS = 10_000;
export const QSTASH_DELETE_RETRY_DELAY_MS = 200;
/** QStash's error body when it cannot reach or resolve the schedule destination. */
export const QSTASH_DESTINATION_REJECTION_PATTERN =
  /invalid destination|unable to resolve host/i;
