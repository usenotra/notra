import { Octokit } from "@octokit/core";

// https://github.com/octokit/core.js#readme
export function createOctokit(auth?: string) {
  return new Octokit({
    auth,
  });
}
