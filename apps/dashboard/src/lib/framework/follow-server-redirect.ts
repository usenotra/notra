import { isRedirect } from "@tanstack/react-router";

/**
 * A server function that throws `redirect()` only rejects with it on the
 * client; nothing navigates (Next followed a server action's redirect on its
 * own). Navigate to the target instead. The returned promise never settles
 * because the page is leaving, so callers don't treat the redirect as failure.
 */
export async function followServerRedirect<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    if (isRedirect(error) && typeof window !== "undefined") {
      const { href, to } = error.options;
      const target = href ?? (typeof to === "string" ? to : undefined);
      if (target) {
        window.location.assign(target);
        return new Promise<T>(() => undefined);
      }
    }
    throw error;
  }
}
