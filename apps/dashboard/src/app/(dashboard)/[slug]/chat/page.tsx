import type { Metadata } from "next";
import { Suspense } from "react";

import PageClient from "./page-client";
import { ChatPageSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Chat",
};

export const instant = true;

async function PageContent(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  return <PageClient organizationSlug={slug} />;
}

export default function Page(props: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<ChatPageSkeleton />}>
      <PageContent params={props.params} />
    </Suspense>
  );
}
