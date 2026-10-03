import {
  DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES,
  DEMO_DEFAULT_POOL_SIZE,
} from "@/constants/demo";

/** An integer env override of at least `min`, else the fallback. */
function envInteger(name: string, min: number, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isInteger(configured) && configured >= min
    ? configured
    : fallback;
}

/** NOTRA_DEMO_MAX_SANDBOXES overrides the cap, e.g. on a bigger Neon plan. */
export function demoMaxActiveSandboxes(): number {
  return envInteger(
    "NOTRA_DEMO_MAX_SANDBOXES",
    1,
    DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES
  );
}

/** Ready sandboxes kept in reserve, overridable per deployment. */
export function demoPoolSize(): number {
  return envInteger("NOTRA_DEMO_POOL_SIZE", 0, DEMO_DEFAULT_POOL_SIZE);
}
