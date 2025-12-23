import type { Metadata } from "next";
import { Suspense } from "react";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Integrations",
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
    <Suspense>
      <PageClient organizationId={slug} />
    </Suspense>
  );
}
export default Page;
