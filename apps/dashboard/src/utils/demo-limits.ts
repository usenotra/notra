import { DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES } from "@/constants/demo";

/** NOTRA_DEMO_MAX_SANDBOXES overrides the cap, e.g. on a bigger Neon plan. */
export function demoMaxActiveSandboxes(): number {
  const configured = Number(process.env.NOTRA_DEMO_MAX_SANDBOXES);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEMO_DEFAULT_MAX_ACTIVE_SANDBOXES;
}
