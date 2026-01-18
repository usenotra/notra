import type { Metadata } from "next";
import { Suspense } from "react";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Integration Details",
};

async function Page({
  params,
}: {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}) {
  const { id } = await params;

  return (
    <Suspense>
      <PageClient integrationId={id} />
    </Suspense>
  );
}
export default Page;
