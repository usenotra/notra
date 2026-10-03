import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import PageClient from "./page-client";
import { AgentFeedbackPageSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return { title: tCommon("labels.feedback") };
}

export const instant = true;

async function PageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PageClient organizationSlug={slug} />;
}

function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<AgentFeedbackPageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}

export default Page;
