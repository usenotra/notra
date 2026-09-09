import { createTimeoutFetch } from "@notra/utils/timeout-fetch";
import { Octokit } from "@octokit/core";

/**
 * GitHub calls happen in loops (repo listings, content preview pagination), so
 * a stalled request must abort instead of holding the caller open.
 */
const GITHUB_REQUEST_TIMEOUT_MS = 15_000;

export function createOctokit(auth?: string) {
  return new Octokit({
    auth,
    request: {
      fetch: createTimeoutFetch(GITHUB_REQUEST_TIMEOUT_MS),
    },
  });
}
