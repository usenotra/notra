import { ContributorsPageSkeleton } from "@/components/contributors/skeleton";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import {
  CONTRIBUTORS_HERO_SUBTITLE,
  CONTRIBUTORS_HERO_TITLE,
} from "@/constants/contributors";

export default function Loading() {
  return (
    <div className="flex w-full flex-col items-center justify-start overflow-hidden">
      <MarketingHeroWash
        subtitle={CONTRIBUTORS_HERO_SUBTITLE}
        title={CONTRIBUTORS_HERO_TITLE}
      />
      <ContributorsPageSkeleton />
    </div>
  );
}
