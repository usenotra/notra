"use client";

import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AnalyticsNavProps } from "@/types/analytics";

export function AnalyticsNav({ slug }: AnalyticsNavProps) {
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const base = `/${slug}/analytics`;
  const value = pathname.startsWith(`${base}/leaderboard`)
    ? "leaderboard"
    : "overview";

  return (
    <Tabs value={value}>
      <TabsList variant="line">
        <TabsTrigger
          nativeButton={false}
          render={<Link href={base} />}
          value="overview"
        >
          {tCommon("labels.overview")}
        </TabsTrigger>
        <TabsTrigger
          nativeButton={false}
          render={<Link href={`${base}/leaderboard`} />}
          value="leaderboard"
        >
          {tCommon("labels.leaderboard")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
