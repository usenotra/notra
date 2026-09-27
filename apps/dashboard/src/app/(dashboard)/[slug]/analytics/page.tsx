import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return {
    title: tCommon("labels.analytics"),
  };
}

function Page() {
  return <PageClient />;
}

export default Page;
