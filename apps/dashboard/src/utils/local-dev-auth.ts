/**
 * AuthKit's Edge proxy reads `process.env[name]`, which Next does not inline.
 * Without a live WorkOS key, every request 500s. Development can skip AuthKit
 * and authenticate as a local database user instead. Production never takes
 * this path.
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
  nodeEnv = process.env.NODE_ENV,
  apiKey = process.env.WORKOS_API_KEY
): boolean {
  return nodeEnv !== "production" && !isLiveWorkOSApiKey(apiKey);
}
