import { isDemoMode } from "@notra/utils/demo-mode";
import { createTimeoutFetch } from "@notra/utils/timeout-fetch";
import { Octokit } from "@octokit/core";

import { demoGitHubFetch } from "./demo-github";

/**
 * Budget for GitHub reads that a user is waiting on (repo probe, repository
 * listings). Publishing, uploads and recursive tree reads stay unbounded: an
 * aborted write can leave a half-applied commit, and large trees legitimately
 * take longer than an interactive request.
 */
export const GITHUB_INTERACTIVE_READ_TIMEOUT_MS = 15_000;

function requestFetch(timeoutMs?: number): typeof fetch | undefined {
  // The public demo reads a fictional repository and never calls GitHub.
  if (isDemoMode()) {
    return demoGitHubFetch;
  }
  return timeoutMs === undefined ? undefined : createTimeoutFetch(timeoutMs);
}

export function createOctokit(
  auth?: string,
  options?: { requestTimeoutMs?: number }
) {
  const fetch = requestFetch(options?.requestTimeoutMs);
  return new Octokit({ auth, ...(fetch ? { request: { fetch } } : {}) });
}
