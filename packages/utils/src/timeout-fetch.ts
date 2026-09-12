/**
 * Wraps `fetch` with a per-request deadline for SDKs that accept a `fetch`
 * override but no timeout option (Octokit, Tinybird). An explicit caller signal
 * still applies alongside it; the request aborts as soon as either fires.
 */
export function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    let callerSignal = init?.signal;
    if (callerSignal === undefined && input instanceof Request) {
      callerSignal = input.signal;
    }
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;

    return fetch(input, { ...init, signal });
  };
}
