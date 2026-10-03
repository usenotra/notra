export const PERPLEXITY_THINKING_MS = 1500;
export const PERPLEXITY_THINKING_GAP_MS = 120;
export const PERPLEXITY_SEARCH_HEADER_MS = 480;
export const PERPLEXITY_SEARCH_QUERY_MS = 520;
export const PERPLEXITY_SEARCH_SOURCES_MS = 720;
export const PERPLEXITY_SEARCH_STAGGER_MS = 70;

export function perplexitySearchDuration(
  queryCount: number,
  reducedMotion: boolean
) {
  if (reducedMotion) {
    return 0;
  }

  return (
    PERPLEXITY_SEARCH_HEADER_MS +
    queryCount * PERPLEXITY_SEARCH_QUERY_MS +
    PERPLEXITY_SEARCH_SOURCES_MS
  );
}
