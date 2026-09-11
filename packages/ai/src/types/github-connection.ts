export type GitHubConnectionMethod =
  | "github-app"
  | "personal-access-token"
  | "unauthenticated";

export interface GitHubConnectionCredentials {
  githubAppInstallationId: string | null;
  encryptedToken: string | null;
}
