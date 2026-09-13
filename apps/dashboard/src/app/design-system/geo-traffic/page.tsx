import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { DESIGN_SYSTEM_TRAFFIC_RESPONSE } from "@/constants/design-system-traffic";

export default function GeoTrafficDesignSystemPage() {
  return (
    <main className="bg-muted/30 min-h-screen p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <AiTrafficCard
          settingsHref="/design-system/geo-traffic"
          traffic={DESIGN_SYSTEM_TRAFFIC_RESPONSE}
        />
      </div>
    </main>
  );
}
