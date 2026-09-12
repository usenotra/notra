import { createTimeoutFetch } from "@notra/utils/timeout-fetch";
import { Octokit } from "@octokit/core";

/**
 * Budget for GitHub reads that a user is waiting on (repo probe, repository
 * listings). Publishing, uploads and recursive tree reads stay unbounded: an
 * aborted write can leave a half-applied commit, and large trees legitimately
 * take longer than an interactive request.
 */
export const GITHUB_INTERACTIVE_READ_TIMEOUT_MS = 15_000;

export function createOctokit(
  auth?: string,
  options?: { requestTimeoutMs?: number }
) {
  return new Octokit({
    auth,
    ...(options?.requestTimeoutMs === undefined
      ? {}
      : {
          request: {
            fetch: createTimeoutFetch(options.requestTimeoutMs),
          },
        }),
  });
}
