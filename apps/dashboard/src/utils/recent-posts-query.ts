import { NAV_RECENT_LIMIT } from "@/constants/nav";

export function recentPostsQueryInput(
  organizationId: string,
  projectId: string | undefined
) {
  return {
    organizationId,
    projectId,
    limit: NAV_RECENT_LIMIT,
  };
}
