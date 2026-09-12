import type {
  GitHubConnectionCredentials,
  GitHubConnectionMethod,
} from "../types/github-connection";

export function getGitHubConnectionMethod(
  credentials: GitHubConnectionCredentials
): GitHubConnectionMethod {
  if (credentials.githubAppInstallationId) {
    return "github-app";
  }
  return credentials.encryptedToken
    ? "personal-access-token"
    : "unauthenticated";
}
