import { isDemoMode } from "@notra/utils/demo-mode";

/**
 * Local development and the public demo skip Autumn plan/credit gates when no
 * Autumn key is configured. Production always has a key, so never bypasses.
 */
export function shouldBypassAutumnInDevelopment(
  nodeEnv: string | undefined,
  secretKey: string | undefined
): boolean {
  return (nodeEnv === "development" || isDemoMode()) && !secretKey;
}
