import { MentionRateCard } from "@/components/geo/mention-rate-card";
import { MentionTrendCard } from "@/components/geo/mention-trend-card";
import {
  DESIGN_SYSTEM_GEO_OVERVIEW,
  DESIGN_SYSTEM_GEO_POINTS,
  DESIGN_SYSTEM_GEO_POINTS_FEW,
  DESIGN_SYSTEM_GEO_TRACKED_ENGINES,
} from "@/constants/design-system-geo";

function ActivityState({
  label,
  points,
}: {
  label: string;
  points: typeof DESIGN_SYSTEM_GEO_POINTS;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{label}</h2>
      <div className="h-[430px]">
        <MentionTrendCard points={points} />
      </div>
    </section>
  );
}

export default function GeoDemoPage() {
  return (
    <main className="bg-muted/30 min-h-screen p-8 lg:p-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Visibility activity · 30 days</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MentionRateCard
                engines={DESIGN_SYSTEM_GEO_OVERVIEW}
                timeseriesPoints={DESIGN_SYSTEM_GEO_POINTS}
                trackedEngines={DESIGN_SYSTEM_GEO_TRACKED_ENGINES}
              />
            </div>
            <div className="h-[430px] lg:col-span-7">
              <MentionTrendCard points={DESIGN_SYSTEM_GEO_POINTS} />
            </div>
          </div>
        </section>
        <ActivityState
          label="Visibility activity · 5 days"
          points={DESIGN_SYSTEM_GEO_POINTS_FEW}
        />
        <ActivityState label="Visibility activity · no data" points={[]} />
      </div>
    </main>
  );
}
