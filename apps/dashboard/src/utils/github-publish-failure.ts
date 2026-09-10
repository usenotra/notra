import type {
  GitHubErrorHeaders,
  GitHubPublishFailureKind,
} from "../types/integrations/github";

export function hasGitHubStatus(error: unknown, status: number) {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status === status
  );
}

function getGitHubErrorHeaders(error: unknown): GitHubErrorHeaders | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  if (
    "headers" in error &&
    error.headers &&
    typeof error.headers === "object"
  ) {
    return error.headers as GitHubErrorHeaders;
  }

  if (!("response" in error)) {
    return undefined;
  }

  const response = error.response;
  if (!response || typeof response !== "object" || !("headers" in response)) {
    return undefined;
  }

  const { headers } = response;
  return headers && typeof headers === "object"
    ? (headers as GitHubErrorHeaders)
    : undefined;
}

function hasGitHubGraphQLErrorType(error: unknown, type: string) {
  if (!(error instanceof Error) || !("errors" in error)) {
    return false;
  }

  return (
    Array.isArray(error.errors) &&
    error.errors.some(
      (graphQLError) =>
        graphQLError &&
        typeof graphQLError === "object" &&
        "type" in graphQLError &&
        graphQLError.type === type
    )
  );
}

function getHeaderCaseInsensitive(
  headers: GitHubErrorHeaders | undefined,
  name: string
) {
  const key = Object.keys(headers ?? {}).find(
    (headerName) => headerName.toLowerCase() === name.toLowerCase()
  );
  return key ? headers?.[key] : undefined;
}

export function classifyGitHubPublishFailure(
  error: unknown
): GitHubPublishFailureKind {
  if (
    hasGitHubStatus(error, 401) ||
    hasGitHubGraphQLErrorType(error, "UNAUTHORIZED")
  ) {
    return "authentication";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const isForbidden =
    hasGitHubStatus(error, 403) ||
    hasGitHubGraphQLErrorType(error, "FORBIDDEN");
  const headers = getGitHubErrorHeaders(error);
  const remaining = getHeaderCaseInsensitive(headers, "x-ratelimit-remaining");
  const retryAfter = getHeaderCaseInsensitive(headers, "retry-after");

  if (
    hasGitHubStatus(error, 429) ||
    (isForbidden && retryAfter !== undefined) ||
    String(remaining ?? "") === "0" ||
    hasGitHubGraphQLErrorType(error, "RATE_LIMITED") ||
    message.includes("secondary rate limit")
  ) {
    return "rate_limit";
  }

  if (
    message.includes("resource not accessible by integration") ||
    message.includes("resource not accessible by personal access token") ||
    message.includes("permission to the resource") ||
    message.includes("insufficient scope")
  ) {
    return "permissions";
  }

  return isForbidden ? "forbidden" : "unknown";
}
