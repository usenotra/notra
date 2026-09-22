import type { Metadata } from "next";
import { Suspense } from "react";

import PageClient from "../page-client";
import { ChatPageSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Chat",
};

export const instant = true;

async function PageContent({
  params,
}: {
  params: Promise<{ slug: string; chatId: string }>;
}) {
  const { slug, chatId } = await params;

  return <PageClient chatId={chatId} key={chatId} organizationSlug={slug} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ slug: string; chatId: string }>;
}) {
  return (
    <Suspense fallback={<ChatPageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
