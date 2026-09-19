import type { Metadata } from "next";
import { Suspense } from "react";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Content",
};

export const instant = true;

async function PageContent({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  return <PageClient organizationSlug={slug} />;
}

function Page({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
