import { GITHUB_CONNECTED_COOKIE } from "./github-cookies";

export function subscribeToGithubConnection(listener: () => void): () => void {
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function getGithubLogin(): string | null {
  const prefix = `${GITHUB_CONNECTED_COOKIE}=`;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  if (!entry) {
    return null;
  }
  const value = decodeURIComponent(entry.slice(prefix.length));
  return value.length > 0 ? value : null;
}

export function getServerGithubLogin(): string | null {
  return null;
}

export function buildGithubConnectHref(repoParam: string | null): string {
  if (!repoParam) {
    return "/api/star-video/github/authorize";
  }
  return `/api/star-video/github/authorize?repo=${encodeURIComponent(repoParam)}`;
}
