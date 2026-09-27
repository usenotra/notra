"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useTranslations } from "next-intl";

import { DirectionCockpit } from "@/components/geo/directions/direction-cockpit";
import { DirectionInstrument } from "@/components/geo/directions/direction-instrument";
import { DirectionLeaderboard } from "@/components/geo/directions/direction-leaderboard";
import { DirectionReport } from "@/components/geo/directions/direction-report";
import { PageContainer } from "@/components/layout/container";
import { GEO_DIRECTION_TABS } from "@/constants/geo-directions";

export default function PageClient() {
  const t = useTranslations("geo.pages.directions");
  const tGeoShared = useTranslations("geo.shared");
  const tLabels = useTranslations("common.labels");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-4 px-4 lg:px-6">
        <Tabs defaultValue="instrument">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {tGeoShared("geoDirections")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("description")}
              </p>
            </div>
            <TabsList variant="line">
              {GEO_DIRECTION_TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.key === "leaderboard"
                    ? tLabels("leaderboard")
                    : t(`tabs.${tab.key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </header>

          <TabsContent className="mt-6" value="instrument">
            <DirectionInstrument />
          </TabsContent>
          <TabsContent className="mt-6" value="leaderboard">
            <DirectionLeaderboard />
          </TabsContent>
          <TabsContent className="mt-6" value="cockpit">
            <DirectionCockpit />
          </TabsContent>
          <TabsContent className="mt-6" value="report">
            <DirectionReport />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
