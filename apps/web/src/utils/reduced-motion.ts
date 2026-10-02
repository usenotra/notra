const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function getReducedMotionServerSnapshot() {
  return false;
}
