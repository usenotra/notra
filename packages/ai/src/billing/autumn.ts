import { Autumn } from "autumn-js";

import { shouldBypassAutumnInDevelopment } from "../utils/autumn-development";

const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;

/**
 * Billing checks sit in front of user-facing reads, so a stalled Autumn must
 * surface as an error instead of holding the request open.
 */
const AUTUMN_REQUEST_TIMEOUT_MS = 5000;

export const autumn = AUTUMN_SECRET_KEY
  ? new Autumn({
      secretKey: AUTUMN_SECRET_KEY,
      timeoutMs: AUTUMN_REQUEST_TIMEOUT_MS,
    })
  : null;

// Local development skips Autumn plan/credit gates so AI features work without
// billing. Production never uses this bypass.
export const allowUnmeteredAiInDevelopment = shouldBypassAutumnInDevelopment(
  process.env.NODE_ENV,
  AUTUMN_SECRET_KEY
);
