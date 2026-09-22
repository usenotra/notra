import type { Metadata } from "next";
import { Suspense } from "react";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Google Search Console",
};

async function Page({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <PageClient organizationSlug={slug} />
    </Suspense>
  );
}
export default Page;
