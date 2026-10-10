import { cn } from "@notra/ui/lib/utils";

import { SitesCardAgents } from "@/components/feature-pages/sites-card-agents";
import { SitesCardAnalytics } from "@/components/feature-pages/sites-card-analytics";
import { SitesCardComponents } from "@/components/feature-pages/sites-card-components";
import { SitesCardDomains } from "@/components/feature-pages/sites-card-domains";
import { SitesCardPreviews } from "@/components/feature-pages/sites-card-previews";
import { SitesCardStarter } from "@/components/feature-pages/sites-card-starter";
import { SitesPipeline } from "@/components/feature-pages/sites-pipeline";
import { FeaturesCard } from "@/components/landing/features-card";
import {
  FEATURE_SECTION_CLASS,
  FEATURE_SECTION_HEADING_CLASS,
} from "@/constants/feature-pages/layout";
import {
  SITES_AGENTS_COPY,
  SITES_ANALYTICS_COPY,
  SITES_COMPONENTS_COPY,
  SITES_DOMAINS_COPY,
  SITES_FEATURES_COPY,
  SITES_FEATURES_EYEBROW,
  SITES_PIPELINE_EYEBROW,
  SITES_PAGE,
  SITES_PREVIEWS_COPY,
  SITES_STARTER_COPY,
} from "@/constants/feature-pages/sites";

const SITES_EYEBROW_CLASS =
  "font-mono text-xs font-medium tracking-[0.08em] text-[#7C4DEB] uppercase dark:text-[#C4B5FD]";

export function SitesPageBody() {
  const { overview } = SITES_PAGE;

  return (
    <>
      <section className={cn(FEATURE_SECTION_CLASS, "flex flex-col gap-12")}>
        <div className="grid gap-4 lg:grid-cols-2 lg:items-end lg:gap-16">
          <div className="flex flex-col gap-3">
            <span className={SITES_EYEBROW_CLASS}>
              {SITES_PIPELINE_EYEBROW}
            </span>
            <h2 className={FEATURE_SECTION_HEADING_CLASS}>
              {overview.heading}
            </h2>
          </div>
          <p className="font-sans text-[1.0625rem]/6.75 text-[#6B6B6B] dark:text-white/60">
            {overview.description}
          </p>
        </div>
        <SitesPipeline />
        <dl className="grid gap-6 sm:grid-cols-3 sm:gap-10">
          {overview.facts.map((fact) => (
            <div className="flex flex-col gap-1" key={fact.title}>
              <dt className="font-sans text-base/5.5 font-semibold text-[#1E1E1E] dark:text-white">
                {fact.title}
              </dt>
              <dd className="font-sans text-[0.9375rem]/6 text-[#6B6B6B] dark:text-white/60">
                {fact.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={cn(FEATURE_SECTION_CLASS, "flex flex-col gap-12")}>
        <header className="flex max-w-2xl flex-col gap-3">
          <span className={SITES_EYEBROW_CLASS}>{SITES_FEATURES_EYEBROW}</span>
          <h2 className={FEATURE_SECTION_HEADING_CLASS}>
            {SITES_FEATURES_COPY.heading}
          </h2>
          <p className="font-sans text-[1.0625rem]/6.75 text-[#6B6B6B] dark:text-white/60">
            {SITES_FEATURES_COPY.description}
          </p>
        </header>
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          <FeaturesCard copy={SITES_PREVIEWS_COPY}>
            <SitesCardPreviews />
          </FeaturesCard>
          <FeaturesCard copy={SITES_DOMAINS_COPY}>
            <SitesCardDomains />
          </FeaturesCard>
          <FeaturesCard copy={SITES_STARTER_COPY}>
            <SitesCardStarter />
          </FeaturesCard>
          <FeaturesCard copy={SITES_COMPONENTS_COPY}>
            <SitesCardComponents />
          </FeaturesCard>
          <FeaturesCard copy={SITES_AGENTS_COPY}>
            <SitesCardAgents />
          </FeaturesCard>
          <FeaturesCard copy={SITES_ANALYTICS_COPY}>
            <SitesCardAnalytics />
          </FeaturesCard>
        </div>
      </section>
    </>
  );
}
