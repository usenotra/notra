"use client";

import { PageHeading } from "@notra/ui/components/shared/page-heading";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useTranslations } from "use-intl";

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
          <PageHeading
            className="@min-[40rem]/main:items-end"
            description={t("description")}
            title={tGeoShared("geoDirections")}
          >
            <TabsList variant="line">
              {GEO_DIRECTION_TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.key === "leaderboard"
                    ? tLabels("leaderboard")
                    : t(`tabs.${tab.key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </PageHeading>

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
