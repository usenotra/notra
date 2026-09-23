import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SharedContentView } from "@/components/content/shared-content-view";
import { getUnlistedSharedContent } from "@/lib/content/shared-content.server";

interface SharedContentPageProps {
  params: Promise<{ token: string }>;
}

export const instant = false;

export async function generateMetadata({
  params,
}: SharedContentPageProps): Promise<Metadata> {
  const { token } = await params;
  const content = await getUnlistedSharedContent(token);

  return {
    title: content?.title ?? "Shared content",
    robots: { index: false, follow: false },
  };
}

export default async function SharedContentPage({
  params,
}: SharedContentPageProps) {
  const { token } = await params;
  const content = await getUnlistedSharedContent(token);

  if (!content) {
    notFound();
  }

  return <SharedContentView content={content} />;
}
