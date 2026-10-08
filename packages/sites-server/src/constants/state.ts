import { Schedule } from "effect";

export const CAS_ATTEMPTS = 6;
export const CAS_BACKOFF_MS = 50;

export const SERVING_STATE_RETRY_SCHEDULE = Schedule.exponential(
  CAS_BACKOFF_MS
).pipe(Schedule.upTo({ times: CAS_ATTEMPTS - 1 }));
