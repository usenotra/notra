export function loadMotionFeatures() {
  return import("@/lib/motion-features").then((module) => module.default);
}
