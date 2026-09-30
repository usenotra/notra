import { DEMO_ORG_SLUG_PATH } from "@/constants/demo";

/** Only same-origin absolute paths; never protocol-relative URLs. */
export function safeDemoReturnTo(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

/**
 * Where a freshly created sandbox lands. A shared demo link points into
 * someone else's workspace, so its slug is swapped for the visitor's own and
 * the rest of the path (e.g. /geo/prompts) is kept.
 */
export function resolveDemoLanding(
  returnTo: string | null,
  slug: string
): string {
  if (!returnTo || returnTo === "/") {
    return `/${slug}`;
  }
  const match = DEMO_ORG_SLUG_PATH.exec(returnTo);
  if (match) {
    return `/${slug}${match[1] ?? ""}`;
  }
  return returnTo;
}
