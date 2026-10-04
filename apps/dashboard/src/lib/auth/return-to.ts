const LAST_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;

// Browsers drop tabs and newlines from URLs, so "/\t/evil.com" would become
// the protocol-relative "//evil.com".
function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= LAST_CONTROL_CODE || code === DELETE_CODE) {
      return true;
    }
  }
  return false;
}

/** A path on this origin: no protocol-relative, backslash or control tricks. */
export function isSameOriginPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !hasControlCharacter(value)
  );
}

export function sanitizeReturnTo(value: string | null): string | null {
  if (!value) {
    return null;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  return isSameOriginPath(decoded) ? decoded : null;
}

export function buildPostAuthRedirectPath(
  returnTo: string | null | undefined
): string {
  const safeReturnTo = sanitizeReturnTo(returnTo ?? null);

  if (!safeReturnTo) {
    return "/callback";
  }

  const callbackPath = safeReturnTo.split(/[?#]/, 1)[0];
  if (callbackPath === "/callback") {
    return safeReturnTo;
  }

  return `/callback?returnTo=${encodeURIComponent(safeReturnTo)}`;
}
