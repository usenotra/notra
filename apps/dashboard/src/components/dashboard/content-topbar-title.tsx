"use client";

import { BreadcrumbPage } from "@notra/ui/components/ui/breadcrumb";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useContent } from "@/lib/hooks/use-content";
import type { ContentTopbarTitleProps } from "@/types/content/topbar";

export function ContentTopbarTitle({ contentId }: ContentTopbarTitleProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const { data } = useContent(organizationId, contentId);
  const title = data?.content.title;

  return (
    <BreadcrumbPage className="block min-w-0 truncate font-medium">
      {title ?? "Content"}
    </BreadcrumbPage>
  );
}
