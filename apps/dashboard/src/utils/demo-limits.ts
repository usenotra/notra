import {
  DEMO_DEFAULT_POOL_SIZE,
  DEMO_MAX_ACTIVE_SANDBOXES,
} from "@/constants/demo";

/** An integer env override of at least `min`, else the fallback. */
function envInteger(name: string, min: number, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isInteger(configured) && configured >= min
    ? configured
    : fallback;
}

/** Ready sandboxes kept in reserve, overridable per deployment. */
export function demoPoolSize(): number {
  return Math.min(
    envInteger("NOTRA_DEMO_POOL_SIZE", 0, DEMO_DEFAULT_POOL_SIZE),
    DEMO_MAX_ACTIVE_SANDBOXES - 1
  );
}
