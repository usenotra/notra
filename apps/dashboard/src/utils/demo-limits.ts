import {
  DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES,
  DEMO_DEFAULT_POOL_SIZE,
} from "@/constants/demo";

/** NOTRA_DEMO_MAX_SANDBOXES overrides the cap, e.g. on a bigger Neon plan. */
export function demoMaxActiveSandboxes(): number {
  const configured = Number(process.env.NOTRA_DEMO_MAX_SANDBOXES);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES;
}

/** Ready sandboxes kept in reserve, overridable per deployment. */
export function demoPoolSize(): number {
  const configured = Number(process.env.NOTRA_DEMO_POOL_SIZE);
  return Number.isInteger(configured) && configured >= 0
    ? configured
    : DEMO_DEFAULT_POOL_SIZE;
}
