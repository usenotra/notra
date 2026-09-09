/**
 * Pure helpers for the source line shown on the content detail toolbar.
 */

interface ContentSourceCounts {
  repositoryCount: number;
  linearIntegrationCount: number;
}

/**
 * Content can be generated from GitHub repositories, Linear teams, or both, so
 * the source line stays visible as long as one of them is referenced.
 */
export function hasContentSourceReference(
  counts: ContentSourceCounts
): boolean {
  return counts.repositoryCount > 0 || counts.linearIntegrationCount > 0;
}

export function formatLinearSourceLabel(count: number): string {
  return count === 1 ? "1 Linear team" : `${count} Linear teams`;
}
