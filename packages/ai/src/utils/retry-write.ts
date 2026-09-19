const DEFAULT_ATTEMPTS = 3;

/**
 * Retries a database write that follows an action on another system (a GitHub
 * commit, an opened pull request). That action cannot be rolled back, so a
 * transient failure here should not be what leaves the two sides out of step.
 */
export async function retryWrite<T>(
  run: () => Promise<T>,
  attempts = DEFAULT_ATTEMPTS
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    return retryWrite(run, attempts - 1);
  }
}
