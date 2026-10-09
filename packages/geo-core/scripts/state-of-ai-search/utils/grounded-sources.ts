import type { RawSource } from "../shared";

/** Google citations use a redirect URL; resolve it so domain shares count publishers. */
export async function resolveGroundedSources(
  sources: RawSource[]
): Promise<RawSource[]> {
  const resolved = await Promise.all(
    sources.map(async (source) => {
      if (source.domain !== "vertexaisearch.cloud.google.com") {
        return source;
      }
      try {
        const response = await fetch(source.url, {
          redirect: "manual",
          signal: AbortSignal.timeout(10_000),
        });
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) {
          return source;
        }
        const url = new URL(location, source.url);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          return source;
        }
        return {
          ...source,
          url: url.href,
          domain: url.hostname.replace(/^www\./, ""),
        };
      } catch {
        return source;
      }
    })
  );
  return [...new Map(resolved.map((source) => [source.url, source])).values()];
}
