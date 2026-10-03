import type { ReactNode } from "react";

import { SiteLayout } from "@/components/sites/site-layout";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; siteId: string }>;
}) {
  const { slug, siteId } = await params;
  return (
    <SiteLayout organizationSlug={slug} siteId={siteId}>
      {children}
    </SiteLayout>
  );
}
