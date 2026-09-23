import type { PostVisibility } from "@notra/schemas/dashboard/content";

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isShareToken(value: string): boolean {
  return SHARE_TOKEN_PATTERN.test(value);
}

export function contentSharePath(shareToken: string): string {
  return `/s/${shareToken}`;
}

export function contentDashboardPath(
  organizationSlug: string,
  contentId: string
): string {
  return `/${organizationSlug}/content/${contentId}`;
}

export function resolveContentShareHref(input: {
  contentId: string;
  origin: string;
  organizationSlug: string;
  shareToken: string | null;
  visibility: PostVisibility;
}): string {
  if (input.visibility === "unlisted" && input.shareToken) {
    return `${input.origin}${contentSharePath(input.shareToken)}`;
  }

  return `${input.origin}${contentDashboardPath(input.organizationSlug, input.contentId)}`;
}
