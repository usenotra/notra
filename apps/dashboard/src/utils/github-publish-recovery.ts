import type { GitHubPublishRecovery } from "@/types/integrations/github";

export function getGitHubPublishRecovery(
  error: unknown
): GitHubPublishRecovery | null {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return null;
  }

  const { data } = error;
  if (!data || typeof data !== "object" || !("code" in data)) {
    return null;
  }

  const publishingPaused =
    "publishingPaused" in data && data.publishingPaused === true;

  if (
    data.code === "github_authentication_required" ||
    data.code === "github_repository_connection_required" ||
    data.code === "github_token_authentication_required" ||
    data.code === "github_token_permissions_required"
  ) {
    return { code: data.code, publishingPaused };
  }

  if (data.code === "github_content_publishing_paused") {
    return { code: data.code, publishingPaused };
  }

  if (data.code !== "github_app_permissions_required") {
    return null;
  }

  const permissionsUrl =
    "permissionsUrl" in data && typeof data.permissionsUrl === "string"
      ? data.permissionsUrl
      : undefined;
  return {
    code: data.code,
    permissionsUrl,
    publishingPaused,
  };
}
