import { LiveTrafficLog } from "@/components/landing/live-traffic-log";
import type { HeroCollageProps } from "@/types/landing/hero";

export function HeroCollage({ engine }: HeroCollageProps) {
  return (
    <div className="h-[36rem] w-full max-w-[64rem]">
      <LiveTrafficLog engine={engine} />
    </div>
  );
}
