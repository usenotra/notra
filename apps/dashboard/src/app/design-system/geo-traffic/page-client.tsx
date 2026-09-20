"use client";

import { toGeoTrafficTotals } from "@notra/geo-core/utils/ai-traffic";
import { Button } from "@notra/ui/components/ui/button";
import { useMemo, useState } from "react";

import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { DESIGN_SYSTEM_TRAFFIC_RESPONSE } from "@/constants/design-system-traffic";

export default function GeoTrafficDesignSystemClientPage() {
  const [addedVisits, setAddedVisits] = useState(0);
  const traffic = useMemo(() => {
    const sources = DESIGN_SYSTEM_TRAFFIC_RESPONSE.sources.map(
      (source, index) =>
        index === 0
          ? { ...source, visits: source.visits + addedVisits }
          : source
    );
    return {
      ...DESIGN_SYSTEM_TRAFFIC_RESPONSE,
      sources,
      totals: toGeoTrafficTotals(sources),
    };
  }, [addedVisits]);

  return (
    <DesignSystemFrame
      description="AI traffic sources as three stacked tables. The live-update control previews the same selective number transition used by the dashboard."
      title="GEO traffic"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setAddedVisits((current) => current + 3)}>
          Simulate 3 new visits
        </Button>
        <p className="text-muted-foreground text-sm">
          Only changed headline values animate; tables remain stable.
        </p>
      </div>
      <AiTrafficCard
        pages={[]}
        settingsHref="/design-system/geo-traffic"
        traffic={traffic}
      />
    </DesignSystemFrame>
  );
}
