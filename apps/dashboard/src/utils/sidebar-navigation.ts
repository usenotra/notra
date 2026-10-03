const PROJECT_PARAM = "project";

/**
 * Whether the URL change from `previous` to `next` is a navigation that
 * should close the mobile sidebar. Opening the sidebar fills in the active
 * project (`?project=`) on pages that had none; that is not a navigation, and
 * treating it as one closed the sheet right after the first tap.
 */
export function isNavigation(previous: string, next: string): boolean {
  if (previous === next) {
    return false;
  }
  const before = new URL(previous, "http://local");
  const after = new URL(next, "http://local");
  if (
    before.pathname !== after.pathname ||
    before.searchParams.has(PROJECT_PARAM)
  ) {
    return true;
  }
  after.searchParams.delete(PROJECT_PARAM);
  return before.searchParams.toString() !== after.searchParams.toString();
}
