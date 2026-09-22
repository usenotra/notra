export const ACTIVE_GENERATIONS_POLL_MS = 3000;
export const ACTIVE_GENERATIONS_IDLE_POLL_MS = 30_000;

export function activeGenerationsPollInterval(
  generations: { length: number } | undefined
): number {
  if (!generations || generations.length === 0) {
    return ACTIVE_GENERATIONS_IDLE_POLL_MS;
  }
  return ACTIVE_GENERATIONS_POLL_MS;
}
