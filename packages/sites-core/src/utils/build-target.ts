import type { SiteBuildTarget } from "@notra/sites-core/types/deployment";
import { sha256Hex } from "@notra/sites-core/utils/hash";
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

function normalizeBuildTarget(target: SiteBuildTarget): SiteBuildTarget {
  return {
    publicOrigin: new URL(target.publicOrigin).origin,
    mounts: normalizeSiteMounts(target.mounts),
    noindex: target.noindex,
    branding: target.branding !== false,
  };
}

export async function hashBuildTarget(
  target: SiteBuildTarget
): Promise<string> {
  const { branding, ...normalized } = normalizeBuildTarget(target);
  // Branding on (the default) is left out so deployments from before the
  // setting keep their hash and stay restorable.
  const hashed = branding ? normalized : { ...normalized, branding };
  const digest = await sha256Hex(
    new TextEncoder().encode(stableStringify(hashed))
  );
  return digest.slice(0, 16);
}
