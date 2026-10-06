import type { BlogEntry } from "../types/entries";

export function splitFeatured(
  entries: BlogEntry[],
  featured: "latest" | "none" | string[]
): { featured: BlogEntry[]; rest: BlogEntry[] } {
  let picked: BlogEntry[] = [];
  if (featured === "latest") {
    picked = entries.slice(0, 1);
  } else if (Array.isArray(featured)) {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    picked = [...new Set(featured)]
      .map((slug) => byId.get(slug.replace(/^\/+|\/+$/g, "")))
      .filter((entry): entry is BlogEntry => entry !== undefined);
  }
  const ids = new Set(picked.map((entry) => entry.id));
  return {
    featured: picked,
    rest: entries.filter((entry) => !ids.has(entry.id)),
  };
}
