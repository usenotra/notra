import { redirect } from "next/navigation";

import { settingsPath } from "@/utils/settings-path";

export const instant = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BillingUsagePage({ params }: PageProps) {
  const { slug } = await params;
  redirect(settingsPath(slug, "billing", { tab: "usage" }));
}
