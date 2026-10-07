import { MentionTrendCard } from "@/components/geo/mention-trend-card";
import { DESIGN_SYSTEM_GEO_FIRST_SCAN_POINTS } from "@/constants/design-system-geo";

export default function GeoFirstScanDemoPage() {
  return (
    <main className="bg-muted/30 flex min-h-screen items-center p-8 lg:p-12">
      <div className="mx-auto h-[430px] w-full max-w-4xl">
        <MentionTrendCard points={DESIGN_SYSTEM_GEO_FIRST_SCAN_POINTS} />
      </div>
    </main>
  );
}
