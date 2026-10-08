import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { cn } from "@notra/ui/lib/utils";
import { Link } from "@tanstack/react-router";

import { CtaBanner } from "@/components/landing/cta-banner";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import { NumberedStepCard } from "@/components/numbered-step-card";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  FEATURE_SECTION_CLASS,
  FEATURE_SECTION_HEADING_CLASS,
} from "@/constants/feature-pages/layout";
import {
  CTA_BANNER_CONTACT_HREF,
  CTA_BANNER_PRIMARY_LABEL,
  CTA_BANNER_SECONDARY_LABEL,
} from "@/constants/landing/cta-banner";
import type { FeatureDetailPageProps } from "@/types/feature-detail-page";
import { buildFeatureDetailBreadcrumb } from "@/utils/feature-detail-page";
import { serializeJsonLd } from "@/utils/jsonld";

export function FeatureDetailPage({
  copy,
  title,
  stage,
  overviewVisual,
  overviewVisualFirst = false,
  children,
}: FeatureDetailPageProps) {
  return (
    <div className="flex w-full flex-col items-center gap-20 pb-20 antialiased [font-synthesis:none] lg:gap-24 lg:pb-28">
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-built JSON-LD
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildFeatureDetailBreadcrumb(copy)),
        }}
        type="application/ld+json"
      />

      <MarketingHeroWash
        media={stage}
        subtitle={copy.heroSubtitle}
        title={title}
      >
        <CtaButton
          nativeButton={false}
          render={<TrackedSignupLink source={`${copy.signupSource}_hero`} />}
          size="lg"
          variant="primary"
        >
          {CTA_BANNER_PRIMARY_LABEL}
        </CtaButton>
        <CtaButton
          nativeButton={false}
          render={<Link to={CTA_BANNER_CONTACT_HREF} />}
          size="lg"
          variant="light"
        >
          {CTA_BANNER_SECONDARY_LABEL}
        </CtaButton>
      </MarketingHeroWash>

      {children ?? (
        <section
          className={cn(
            FEATURE_SECTION_CLASS,
            "flex flex-col gap-12 xl:flex-row xl:items-center xl:gap-18"
          )}
        >
          <div className="flex max-w-2xl flex-col gap-9 xl:w-105 xl:shrink-0">
            <div className="flex flex-col gap-3">
              <h2 className={FEATURE_SECTION_HEADING_CLASS}>
                {copy.overview.heading}
              </h2>
              <p className="font-sans text-[1.0625rem]/6.75 text-[#6B6B6B] dark:text-white/60">
                {copy.overview.description}
              </p>
            </div>
            <dl className="flex flex-col gap-5">
              {copy.overview.facts.map((fact) => (
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
          </div>
          <div
            className={cn(
              "min-w-0 flex-1",
              overviewVisualFirst && "xl:order-first"
            )}
          >
            {overviewVisual}
          </div>
        </section>
      )}

      <section className={cn(FEATURE_SECTION_CLASS, "flex flex-col gap-14")}>
        <h2 className={FEATURE_SECTION_HEADING_CLASS}>{copy.steps.heading}</h2>
        <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {copy.steps.items.map((step, index) => (
            <NumberedStepCard
              body={step.description}
              key={step.title}
              number={String(index + 1)}
              title={step.title}
            />
          ))}
        </ol>
      </section>

      <section className="w-full px-6">
        <CtaBanner
          heading={copy.cta.heading}
          signupSource={`${copy.signupSource}_cta`}
          subcopy={copy.cta.subcopy}
        />
      </section>
    </div>
  );
}
