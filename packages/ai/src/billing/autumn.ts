import { Autumn } from "autumn-js";

import { shouldBypassAutumnInDevelopment } from "../utils/autumn-development";

const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;

/**
 * Per-request deadline for read-only billing lookups. Pass it as the request
 * option of a single call: a client-wide timeout would also cut off writes such
 * as `autumn.track`, where an aborted request can silently drop a deduction.
 */
export const AUTUMN_READ_TIMEOUT_MS = 5000;

export const autumn = AUTUMN_SECRET_KEY
  ? new Autumn({ secretKey: AUTUMN_SECRET_KEY })
  : null;

// Local development skips Autumn plan/credit gates so AI features work without
// billing. Production never uses this bypass.
export const allowUnmeteredAiInDevelopment = shouldBypassAutumnInDevelopment(
  process.env.NODE_ENV,
  AUTUMN_SECRET_KEY
);
