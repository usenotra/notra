/**
 * Wraps `fetch` with a per-request deadline for SDKs that accept a `fetch`
 * override but no timeout option (Octokit, Tinybird). An explicit caller signal
 * still applies alongside it; the request aborts as soon as either fires.
 *
 * Native fetch treats `init.signal === null` as no caller signal. `undefined`
 * (or omitting `signal`) still inherits `Request.signal` when `input` is a
 * `Request`. Do not collapse those with `??`.
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
