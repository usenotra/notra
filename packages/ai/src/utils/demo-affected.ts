import type { DemoAffectedEntity } from "@notra/db/types/demo";

const MAX_AFFECTED = 5;
const ID_LIKE = /^[A-Za-z0-9_-]{6,}$/;
const LABEL_KEYS = ["title", "name", "prompt", "label", "domain"] as const;
/** Response envelopes that describe context, not the changed record. */
const CONTEXT_KEYS = new Set(["organization", "project", "meta", "pagination"]);

/** `/v1/projects/p1/geo/prompts/x` → `geo.prompt`; `/v1/posts` → `post`. */
function demoEntityTypeFromPath(path: string): string {
  const segments =
    path
      .split("?")[0]
      ?.split("/")
      .filter((segment) => segment && !/^v\d+$/.test(segment)) ?? [];
  const named = segments.filter(
    (segment, index) =>
      !(ID_LIKE.test(segment) && /\d/.test(segment) && index > 0) &&
      segment !== "projects"
  );
  const last = named.at(-1) ?? "resource";
  const singular = last.endsWith("s") ? last.slice(0, -1) : last;
  return named.includes("geo") && singular !== "geo"
    ? `geo.${singular}`
    : singular;
}

function labelOf(value: Record<string, unknown>): string | undefined {
  for (const key of LABEL_KEYS) {
    const label = value[key];
    if (typeof label === "string" && label.trim()) {
      return label.slice(0, 120);
    }
  }
  return undefined;
}

function collect(
  value: unknown,
  type: string,
  out: DemoAffectedEntity[],
  depth: number
) {
  if (out.length >= MAX_AFFECTED || depth > 2 || !value) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collect(item, type, out, depth + 1);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  const record = value as Record<string, unknown>;
  const id = record.id ?? record.scanId ?? record.postId;
  if (typeof id === "string" && !out.some((entity) => entity.id === id)) {
    out.push({ type, id, label: labelOf(record) });
  }
  for (const [key, nested] of Object.entries(record)) {
    if (nested && typeof nested === "object" && !CONTEXT_KEYS.has(key)) {
      collect(nested, type, out, depth + 1);
    }
  }
}

/**
 * Best-effort list of the records a mutation created or changed, read from
 * its JSON response, so the demo feed can link straight to them.
 */
export function extractDemoAffected(
  path: string,
  responseBody: string | null
): DemoAffectedEntity[] {
  if (!responseBody) {
    return [];
  }
  try {
    const out: DemoAffectedEntity[] = [];
    collect(JSON.parse(responseBody), demoEntityTypeFromPath(path), out, 0);
    return out;
  } catch {
    return [];
  }
}
