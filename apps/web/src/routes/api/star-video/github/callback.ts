import { createFileRoute } from "@tanstack/react-router";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

import {
  GITHUB_CONNECTED_COOKIE,
  GITHUB_COOKIE_MAX_AGE_SECONDS,
  GITHUB_COOKIE_PATH,
  GITHUB_STATE_COOKIE,
  GITHUB_TOKEN_COOKIE,
  GITHUB_TOKEN_COOKIE_PATH,
} from "@/lib/star-video/github-cookies";
import {
  encryptGithubToken,
  exchangeGithubCode,
  fetchGithubLogin,
  getGithubCallbackUrl,
  getGithubOAuthConfig,
  readPendingOAuthStates,
} from "@/lib/star-video/github-oauth";
import { githubCallbackQuerySchema } from "@/schemas/star-video";

async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const query = githubCallbackQuerySchema.safeParse({
    code: requestUrl.searchParams.get("code") ?? "",
    state: requestUrl.searchParams.get("state") ?? "",
  });
  const pendingStates = readPendingOAuthStates(getCookie(GITHUB_STATE_COOKIE));
  const stateData = query.success
    ? pendingStates.find((entry) => entry.state === query.data.state)
    : undefined;

  const returnUrl = new URL("/repo-star-video", requestUrl.origin);
  if (stateData?.repo) {
    returnUrl.searchParams.set("repo", stateData.repo);
  }

  const response = Response.redirect(returnUrl, 307);
  deleteCookie(GITHUB_STATE_COOKIE, { path: GITHUB_COOKIE_PATH });

  const config = getGithubOAuthConfig();
  if (!(config && stateData && query.success)) {
    return response;
  }

  const redirectUri = getGithubCallbackUrl(request);
  const token = await exchangeGithubCode(query.data.code, redirectUri, config);
  if (!token) {
    return response;
  }
  const login = await fetchGithubLogin(token);
  if (!login) {
    return response;
  }

  const cookieOptions = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GITHUB_COOKIE_MAX_AGE_SECONDS,
  } as const;

  setCookie(
    GITHUB_TOKEN_COOKIE,
    encryptGithubToken(token, config.clientSecret),
    { ...cookieOptions, httpOnly: true, path: GITHUB_TOKEN_COOKIE_PATH }
  );
  setCookie(GITHUB_CONNECTED_COOKIE, login, {
    ...cookieOptions,
    path: GITHUB_COOKIE_PATH,
  });
  return response;
}

export const Route = createFileRoute("/api/star-video/github/callback")({
  server: { handlers: { GET: ({ request }) => GET(request) } },
});
