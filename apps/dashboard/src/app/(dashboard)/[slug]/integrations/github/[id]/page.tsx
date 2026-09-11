import { redirect } from "next/navigation";

import type { GitHubLegacyPageProps } from "@/types/integrations/github";

export default async function Page({
  params,
  searchParams,
}: GitHubLegacyPageProps) {
  const [{ slug, id }, query] = await Promise.all([params, searchParams]);
  const nextQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        nextQuery.append(key, item);
      }
    }
  }
  const suffix = nextQuery.size ? `?${nextQuery.toString()}` : "";
  redirect(
    `/${encodeURIComponent(slug)}/integrations/github${suffix}#repository-${encodeURIComponent(id)}`
  );
}
