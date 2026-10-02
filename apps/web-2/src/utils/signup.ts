import { track } from "@databuddy/sdk/react";

import { AUTH_SIGNUP_URL } from "@/constants/auth";
import {
  DATABUDDY_SIGNUP_STARTED_EVENT,
  serializeSignupAttribution,
} from "@/utils/databuddy";

export function trackedSignupHref(
  source: string,
  href = AUTH_SIGNUP_URL
): string {
  return serializeSignupAttribution(new URL(href, AUTH_SIGNUP_URL), {
    source,
  });
}

export function startSignup(source: string, href = AUTH_SIGNUP_URL): void {
  const destination = trackedSignupHref(source, href);
  track(DATABUDDY_SIGNUP_STARTED_EVENT, {
    destination,
    source,
  });
  window.location.assign(destination);
}
