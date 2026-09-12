import type {
  LocalDevAuthBlockReason,
  LocalDevAuthDecision,
} from "@/types/auth/local-dev-auth";

/**
 * AuthKit's Edge proxy reads `process.env[name]`, which Next does not inline.
 * Without a live WorkOS key, every request 500s. Local `development` can skip
 * AuthKit and authenticate as a database user instead — but only after an
 * explicit opt-in, a pinned email, and a loopback request. Staging, test,
 * production, and tunneled hosts never take this path.
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

function isTruthyEnvFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isLocalDevAuthEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  apiKey: string | undefined = process.env.WORKOS_API_KEY,
  enabledFlag: string | undefined = process.env.DEV_AUTH_ENABLED
): boolean {
  return (
    nodeEnv === "development" &&
    !isLiveWorkOSApiKey(apiKey) &&
    isTruthyEnvFlag(enabledFlag)
  );
}

function localDevAuthEmail(
  email: string | undefined = process.env.DEV_AUTH_EMAIL
): string | null {
  const trimmed = email?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function hostnameFromHostHeader(
  hostHeader: string | null
): string | null {
  if (!hostHeader) {
    return null;
  }
  const trimmed = hostHeader.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end === -1) {
      return null;
    }
    return trimmed.slice(1, end);
  }
  const hostWithPort = /^([^:]+):(\d+)$/.exec(trimmed);
  if (hostWithPort?.[1]) {
    return hostWithPort[1];
  }
  return trimmed;
}

export function requestHostIsLoopback(hostHeader: string | null): boolean {
  const hostname = hostnameFromHostHeader(hostHeader);
  return hostname !== null && LOOPBACK_HOSTNAMES.has(hostname);
}

function isLoopbackAddress(value: string): boolean {
  return LOOPBACK_ADDRESSES.has(value.trim().toLowerCase());
}

export function requestLooksPubliclyExposed(
  headers: { get(name: string): string | null } | null
): boolean {
  if (!headers) {
    return false;
  }
  if (headers.get("cf-ray")) {
    return true;
  }
  const connectingIp =
    headers.get("cf-connecting-ip") ?? headers.get("x-real-ip");
  if (connectingIp && !isLoopbackAddress(connectingIp)) {
    return true;
  }
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) {
    return false;
  }
  return forwarded.split(",").some((part) => !isLoopbackAddress(part));
}

export function evaluateLocalDevAuth(
  headers: { get(name: string): string | null } | null,
  options?: {
    nodeEnv?: string;
    apiKey?: string;
    enabledFlag?: string;
    email?: string;
  }
): LocalDevAuthDecision {
  if (
    !isLocalDevAuthEnabled(
      options?.nodeEnv,
      options?.apiKey,
      options?.enabledFlag
    )
  ) {
    return { kind: "disabled" };
  }
  if (!localDevAuthEmail(options?.email)) {
    return { kind: "blocked", reason: "missing_email" };
  }
  const host = headers?.get("host") ?? null;
  if (!requestHostIsLoopback(host) || requestLooksPubliclyExposed(headers)) {
    return { kind: "blocked", reason: "non_loopback" };
  }
  return { kind: "allowed" };
}

export function localDevAuthBlockedMessage(
  reason: LocalDevAuthBlockReason
): string {
  if (reason === "missing_email") {
    return "Local-dev auth requires DEV_AUTH_EMAIL when DEV_AUTH_ENABLED is set.";
  }
  return "Local-dev auth is limited to loopback. Unset DEV_AUTH_ENABLED before exposing this server.";
}
