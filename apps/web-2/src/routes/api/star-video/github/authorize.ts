import { createFileRoute } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";

import {
  GITHUB_STATE_COOKIE,
  GITHUB_STATE_MAX_AGE_SECONDS,
} from "@/lib/star-video/github-cookies";
import {
  appendPendingOAuthState,
  buildGithubAuthorizeUrl,
  createOAuthState,
  getGithubCallbackUrl,
  getGithubOAuthConfig,
  readPendingOAuthStates,
} from "@/lib/star-video/github-oauth";
import { githubReturnRepoSchema } from "@/schemas/star-video";

function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsedRepo = githubReturnRepoSchema.safeParse(
    requestUrl.searchParams.get("repo") ?? ""
  );
  const repo = parsedRepo.success ? parsedRepo.data : null;

  const returnUrl = new URL("/repo-star-video", requestUrl.origin);
  if (repo) {
    returnUrl.searchParams.set("repo", repo);
  }

  const config = getGithubOAuthConfig();
  if (!config) {
    return Response.redirect(returnUrl, 307);
  }

  const state = createOAuthState();
  const redirectUri = getGithubCallbackUrl(request);

  const pendingStates = appendPendingOAuthState(
    readPendingOAuthStates(getCookie(GITHUB_STATE_COOKIE)),
    { state, repo: repo ?? undefined }
  );
  setCookie(GITHUB_STATE_COOKIE, JSON.stringify(pendingStates), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GITHUB_STATE_MAX_AGE_SECONDS,
  });
  return Response.redirect(
    buildGithubAuthorizeUrl(config.clientId, redirectUri, state),
    307
  );
}

export const Route = createFileRoute("/api/star-video/github/authorize")({
  server: { handlers: { GET: ({ request }) => GET(request) } },
});
