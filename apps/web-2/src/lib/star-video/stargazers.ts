import { Data, Effect } from "effect";
import type { GitHubRepo, GitHubUser } from "~types/github";

import type { RepoStarData } from "@/types/star-video";

const MAX_AVATARS = 60;

class RepoNotFound extends Data.TaggedError("RepoNotFound")<{
  readonly owner: string;
  readonly repo: string;
}> {}

class RepoUnavailable extends Data.TaggedError("RepoUnavailable")<{
  readonly owner: string;
  readonly repo: string;
}> {}

class RepoUnauthorized extends Data.TaggedError("RepoUnauthorized")<{
  readonly owner: string;
  readonly repo: string;
}> {}

function buildFetchOptions(token: string): RequestInit {
  return {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "notra-star-video",
    },
    cache: "no-store",
  };
}

const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;

class GitHubRequestFailed extends Data.TaggedError("GitHubRequestFailed")<{
  readonly cause: unknown;
}> {}

const requestGitHub = (url: string, token: string) =>
  Effect.tryPromise({
    try: (signal) => fetch(url, { ...buildFetchOptions(token), signal }),
    catch: (cause) => new GitHubRequestFailed({ cause }),
  });

const readGitHubJson = <T>(response: Response) =>
  Effect.tryPromise({
    try: () => response.json() as Promise<T>,
    catch: (cause) => new GitHubRequestFailed({ cause }),
  });

/**
 * Avatar sources are best effort: a failed or non-OK request yields `null` so
 * the next source can be tried. Only a rejected token is a real failure.
 */
function fetchAvatarSource<T>(
  url: string,
  token: string,
  owner: string,
  repo: string
): Effect.Effect<T | null, RepoUnauthorized> {
  return Effect.gen(function* () {
    const response = yield* requestGitHub(url, token);
    if (response.status === HTTP_UNAUTHORIZED) {
      return yield* Effect.fail(new RepoUnauthorized({ owner, repo }));
    }
    if (!response.ok) {
      return null;
    }
    return yield* readGitHubJson<T>(response);
  }).pipe(Effect.catchTag("GitHubRequestFailed", () => Effect.succeed(null)));
}

function withSize(avatarUrl: string): string {
  return `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}s=140`;
}

function toAvatarUrls(users: GitHubUser[] | null): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const user of users ?? []) {
    if (!user.avatar_url || user.type !== "User" || seen.has(user.avatar_url)) {
      continue;
    }
    seen.add(user.avatar_url);
    urls.push(withSize(user.avatar_url));
    if (urls.length >= MAX_AVATARS) {
      break;
    }
  }
  return urls;
}

const fetchAvatars = Effect.fnUntraced(function* (
  base: string,
  token: string,
  owner: string,
  repo: string
) {
  const stargazers = yield* fetchAvatarSource<GitHubUser[]>(
    `${base}/stargazers?per_page=100`,
    token,
    owner,
    repo
  );
  const fromStars = toAvatarUrls(stargazers);
  if (fromStars.length > 0) {
    return fromStars;
  }

  const contributors = yield* fetchAvatarSource<GitHubUser[]>(
    `${base}/contributors?per_page=100`,
    token,
    owner,
    repo
  );
  const fromContributors = toAvatarUrls(contributors);
  if (fromContributors.length > 0) {
    return fromContributors;
  }

  const commits = yield* fetchAvatarSource<
    Array<{ author: GitHubUser | null }>
  >(`${base}/commits?per_page=100`, token, owner, repo);
  return toAvatarUrls(
    (commits ?? [])
      .map((commit) => commit.author)
      .filter((author): author is GitHubUser => Boolean(author))
  );
});

export const fetchRepoStarData = Effect.fn("fetchRepoStarData")(function* (
  owner: string,
  repo: string,
  token: string
) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  const metaResponse = yield* requestGitHub(base, token).pipe(
    Effect.mapError(() => new RepoUnavailable({ owner, repo }))
  );

  if (metaResponse.status === HTTP_NOT_FOUND) {
    return yield* Effect.fail(new RepoNotFound({ owner, repo }));
  }

  if (metaResponse.status === HTTP_UNAUTHORIZED) {
    return yield* Effect.fail(new RepoUnauthorized({ owner, repo }));
  }

  if (!metaResponse.ok) {
    return yield* Effect.fail(new RepoUnavailable({ owner, repo }));
  }

  const repoData = yield* readGitHubJson<GitHubRepo>(metaResponse).pipe(
    Effect.mapError(() => new RepoUnavailable({ owner, repo }))
  );

  if (repoData.private) {
    return yield* Effect.fail(new RepoNotFound({ owner, repo }));
  }

  const avatars = yield* fetchAvatars(base, token, owner, repo);
  const resolvedOwner = repoData.full_name.split("/")[0] ?? owner;

  return {
    id: `${resolvedOwner}/${repoData.name}`.toLowerCase(),
    owner: resolvedOwner,
    repo: repoData.name,
    stars: repoData.stargazers_count,
    avatars,
    htmlUrl: repoData.html_url,
  } satisfies RepoStarData;
});
