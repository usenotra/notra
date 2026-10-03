import type { SiteBuildTarget } from "@notra/sites-core/schemas/deployment";
import { normalizeSiteMounts } from "@notra/sites-core/utils/mounts";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeBuildTarget(target: SiteBuildTarget): SiteBuildTarget {
  const origin = new URL(target.publicOrigin).origin;
  return {
    publicOrigin: origin,
    mounts: normalizeSiteMounts(target.mounts),
    noindex: target.noindex,
  };
}

/** Same hash = same URLs, so a rollback to that deployment keeps canonicals, feeds and assets valid. */
export async function hashBuildTarget(
  target: SiteBuildTarget
): Promise<string> {
  const normalized = normalizeBuildTarget(target);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableStringify(normalized))
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
