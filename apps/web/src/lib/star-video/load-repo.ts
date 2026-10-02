import { Effect } from "effect";

import type { RepoStarData } from "@/types/star-video";

import { fingerprintGithubToken } from "./github-oauth";
import { fetchRepoStarData } from "./stargazers";

export type LoadRepoResult =
  | { ok: true; data: RepoStarData }
  | { ok: false; kind: "not-found" | "unavailable" | "unauthorized" };

function failureKind(
  tag: string
): "not-found" | "unavailable" | "unauthorized" {
  if (tag === "RepoUnavailable") {
    return "unavailable";
  }
  if (tag === "RepoUnauthorized") {
    return "unauthorized";
  }
  return "not-found";
}

const inflight = new Map<string, Promise<LoadRepoResult>>();

export function loadRepoStarData(
  owner: string,
  repo: string,
  id: string,
  token: string
): Promise<LoadRepoResult> {
  const inflightKey = `${id}:${fingerprintGithubToken(token)}`;
  const existing = inflight.get(inflightKey);
  if (existing) {
    return existing;
  }

  const promise = Effect.runPromise(
    fetchRepoStarData(owner, repo, token).pipe(
      Effect.match({
        onSuccess: (data): LoadRepoResult => ({ ok: true, data }),
        onFailure: (error): LoadRepoResult => ({
          ok: false,
          kind: failureKind(error._tag),
        }),
      })
    )
  );

  inflight.set(inflightKey, promise);
  promise.finally(() => {
    inflight.delete(inflightKey);
  });
  return promise;
}
