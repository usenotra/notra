import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { DESIGN_SYSTEM_TRAFFIC_RESPONSE } from "@/constants/design-system-traffic";

export default function GeoTrafficDesignSystemPage() {
  return (
    <DesignSystemFrame
      description="AI traffic sources as three stacked tables — Crawlers, Cited, and Referrals — using the same dual-tone table as the rest of the dashboard."
      title="GEO traffic"
    >
      <AiTrafficCard
        settingsHref="/design-system/geo-traffic"
        traffic={DESIGN_SYSTEM_TRAFFIC_RESPONSE}
      />
    </DesignSystemFrame>
  );
}
