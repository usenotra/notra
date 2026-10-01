import { DEMO_HOME_SECTION, DEMO_ORG_SLUG_PATH } from "@/constants/demo";

const FIRST_PRINTABLE_CHAR = 0x20;
const DELETE_CHAR = 0x7f;

// Browsers read `\` as `/` (so `/\evil.com` is protocol-relative) and drop
// tabs/newlines, which would let `/\t/evil.com` collapse into `//evil.com`.
function hasUnsafeChar(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "\\" || code < FIRST_PRINTABLE_CHAR || code === DELETE_CHAR) {
      return true;
    }
  }
  return false;
}

/** Only same-origin absolute paths; never protocol-relative URLs. */
export function safeDemoReturnTo(value: string | null | undefined) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    hasUnsafeChar(value)
  ) {
    return null;
  }
  return value;
}

/** The demo's start page in a workspace. */
export function demoHomePath(slug: string): string {
  return `/${slug}${DEMO_HOME_SECTION}`;
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
    return demoHomePath(slug);
  }
  const match = DEMO_ORG_SLUG_PATH.exec(returnTo);
  if (match) {
    return `/${slug}${match[1] ?? ""}`;
  }
  return returnTo;
}
