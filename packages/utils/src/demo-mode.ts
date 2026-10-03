const TRUTHY_FLAGS = new Set(["1", "true", "yes"]);

function isTruthyFlag(value: string | undefined): boolean {
  return TRUTHY_FLAGS.has(value?.trim().toLowerCase() ?? "");
}

/**
 * The public demo (demo.usenotra.com / demo-api.usenotra.com) runs the real
 * apps against a throwaway database with every external side effect stubbed.
 * It only turns on when explicitly flagged AND no WorkOS key is configured, so
 * a production deployment can never flip into demo mode by accident.
 */
export function isDemoMode(
  flag: string | undefined = process.env.NOTRA_DEMO_MODE,
  workosApiKey: string | undefined = process.env.WORKOS_API_KEY
): boolean {
  return isTruthyFlag(flag) && !workosApiKey?.trim();
}

/**
 * Client bundles cannot read server env, so the dashboard also exposes the
 * flag as NEXT_PUBLIC_NOTRA_DEMO_MODE. Only use this for UI decisions.
 */
export function isDemoModeClient(): boolean {
  return isTruthyFlag(process.env.NEXT_PUBLIC_NOTRA_DEMO_MODE);
}
