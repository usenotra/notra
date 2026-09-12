/**
 * AuthKit's Edge proxy reads `process.env[name]`, which Next does not inline.
 * Without a live WorkOS key, every request 500s. Local `development` can skip
 * AuthKit and authenticate as a database user instead. Staging, test, and
 * production never take this path — a missing WorkOS key there must fail
 * closed rather than impersonate the latest user.
 */
export function isLiveWorkOSApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) {
    return false;
  }
  return (
    apiKey.startsWith("sk_") &&
    apiKey.length >= 24 &&
    !apiKey.includes("placeholder")
  );
}

export function isLocalDevAuthEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  apiKey: string | undefined = process.env.WORKOS_API_KEY
): boolean {
  return nodeEnv === "development" && !isLiveWorkOSApiKey(apiKey);
}
