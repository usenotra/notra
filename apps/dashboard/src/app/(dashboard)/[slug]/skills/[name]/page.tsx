import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("skills.detail");
  return {
    title: t("metaTitle"),
  };
}

async function Page({
  params,
}: {
  params: Promise<{ slug: string; name: string }>;
}) {
  const { slug, name } = await params;
  return <PageClient name={name} slug={slug} />;
}

export default Page;
