import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import LeaderboardPageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return {
    title: tCommon("labels.leaderboard"),
  };
}

function Page() {
  return <LeaderboardPageClient />;
}

export default Page;
