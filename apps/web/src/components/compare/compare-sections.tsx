import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { cn } from "@notra/ui/lib/utils";
import { Link } from "@tanstack/react-router";

import { CompareLogoTile } from "@/components/compare/compare-logo";
import { CompareCell } from "@/components/compare/compare-table";
import { HeroDither } from "@/components/landing/hero-dither";
import { NumberedStepCard } from "@/components/numbered-step-card";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  COMPARE_BODY_CLASS,
  COMPARE_CARD_CLASS,
  COMPARE_CARD_HEADING_CLASS,
  COMPARE_NOTE_CLASS,
  COMPARE_NOTRA_CARD_CLASS,
  COMPARE_SECTION_CLASS,
  COMPARE_SECTION_HEADING_CLASS,
} from "@/constants/compare/classes";
import {
  COMPARE_AT_A_GLANCE_ROWS,
  COMPARE_CORRECTION_HREF,
  COMPARE_CORRECTION_LABEL,
  COMPARE_DISCLAIMER,
  COMPARE_PATH,
  NOTRA_COMPARE_LOGO,
  NOTRA_COMPARE_PLANS,
  NOTRA_PRICING_NOTE,
} from "@/constants/compare/page";
import { CTA_BANNER_PRIMARY_LABEL } from "@/constants/landing/cta-banner";
import type {
  CompareCompetitorProps,
  ComparePlanCardProps,
  CompareReasonListProps,
  CompareRelatedProps,
  CompareSignupProps,
} from "@/types/compare";
import {
  findCompareRow,
  getCompareCorrectionBody,
  getCompareCorrectionHeading,
  getCompareHref,
  getCompareTitle,
  splitHeadline,
} from "@/utils/compare";

export function CompareHero({ competitor, signupSource }: CompareSignupProps) {
  const [before, after] = splitHeadline(
    competitor.headline,
    competitor.headlineAccent
  );

  return (
    <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
      <div className="relative isolate overflow-clip rounded-3xl bg-[#EFEAFA] dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>
        <div className="relative flex w-full flex-col items-center gap-6 px-6 pt-28 pb-16 lg:pt-32 lg:pb-20">
          <h1 className="flex flex-col items-center gap-6 text-center">
            <span className="flex items-center gap-2.5 font-sans text-lg font-medium text-[#1E1E1EBF] dark:text-white/75">
              <CompareLogoTile logo={NOTRA_COMPARE_LOGO} size="xs" />
              Notra
              <span className="px-1 text-sm font-semibold tracking-[0.08em] text-[#1E1E1E66] uppercase dark:text-white/40">
                vs
              </span>
              <CompareLogoTile logo={competitor.logo} size="xs" />
              {competitor.name}
            </span>
            <span className="font-display max-w-[52rem] text-[2.75rem] leading-[1.06] font-medium tracking-[-0.025em] text-balance text-[#1E1E1E] sm:text-[3.75rem] lg:text-[4.5rem] dark:text-white">
              {before}
              <span className="text-primary">{competitor.headlineAccent}</span>
              {after}
            </span>
          </h1>
          <p className="max-w-[40rem] text-center font-sans text-[1.0625rem] leading-[1.5] font-medium tracking-[-0.005em] text-balance text-[#1E1E1EBF] sm:text-[1.1875rem] dark:text-white/70">
            {competitor.heroSubtitle}
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <CtaButton
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<TrackedSignupLink source={`${signupSource}_hero`} />}
              variant="primary"
            >
              {CTA_BANNER_PRIMARY_LABEL}
            </CtaButton>
            <CtaButton
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link to="/pricing" />}
              variant="light"
            >
              See Notra pricing
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompareAtAGlance({ competitor }: CompareCompetitorProps) {
  const rows = COMPARE_AT_A_GLANCE_ROWS.flatMap((id) => {
    const row = findCompareRow(id);
    return row ? [row] : [];
  });

  return (
    <section className={COMPARE_SECTION_CLASS}>
      <h2 className={COMPARE_SECTION_HEADING_CLASS}>At a glance</h2>
      <div className="overflow-hidden rounded-3xl border border-[#1E1E1E1A] dark:border-white/10">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-[#1E1E1E14] dark:border-white/[0.08]">
          <span className="px-4 py-4 sm:px-6" />
          <span className="font-display text-primary flex items-center justify-center gap-2.5 bg-[#C8B2EE26] px-4 py-4 text-center text-lg font-medium sm:px-6 dark:bg-[#8B5CF614]">
            <span className="hidden sm:inline-flex">
              <CompareLogoTile logo={NOTRA_COMPARE_LOGO} size="xs" />
            </span>
            Notra
          </span>
          <span className="font-display flex items-center justify-center gap-2.5 px-4 py-4 text-center text-lg font-medium text-[#1E1E1E] sm:px-6 dark:text-white">
            <span className="hidden sm:inline-flex">
              <CompareLogoTile logo={competitor.logo} size="xs" />
            </span>
            {competitor.name}
          </span>
        </div>
        {rows.map((row) => (
          <div
            className="grid grid-cols-[1.2fr_1fr_1fr] items-center border-t border-[#1E1E1E0F] first-of-type:border-t-0 dark:border-white/[0.06]"
            key={row.id}
          >
            <span className="px-4 py-4 font-sans text-[0.9375rem] text-[#1E1E1E] sm:px-6 dark:text-white/90">
              {row.label}
            </span>
            <span className="flex h-full items-center justify-center bg-[#C8B2EE14] px-4 py-4 text-center sm:px-6 dark:bg-[#8B5CF60A]">
              <CompareCell highlight value={row.notra} />
            </span>
            <span className="flex justify-center px-4 py-4 text-center sm:px-6">
              <CompareCell value={competitor.values[row.id]} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareReasonList({
  title,
  reasons,
  highlight = false,
}: CompareReasonListProps) {
  return (
    <div
      className={cn(COMPARE_CARD_CLASS, highlight && COMPARE_NOTRA_CARD_CLASS)}
    >
      <h3 className={COMPARE_CARD_HEADING_CLASS}>{title}</h3>
      <ul className="flex flex-col gap-3">
        {reasons.map((reason) => (
          <li className="flex gap-3" key={reason}>
            <HugeiconsIcon
              className={cn(
                "mt-0.5 size-5 shrink-0",
                highlight
                  ? "text-primary"
                  : "text-[#1E1E1E66] dark:text-white/40"
              )}
              icon={CheckmarkCircle02Icon}
            />
            <span
              className={cn(
                "font-sans text-[0.9375rem] leading-6",
                highlight
                  ? "text-[#1E1E1E] dark:text-white/90"
                  : "text-[#1E1E1EBF] dark:text-white/70"
              )}
            >
              {reason}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompareShortAnswer({ competitor }: CompareCompetitorProps) {
  return (
    <section className={COMPARE_SECTION_CLASS}>
      <h2 className={COMPARE_SECTION_HEADING_CLASS}>The short answer</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <CompareReasonList
          highlight
          reasons={competitor.chooseNotra}
          title="Pick Notra if"
        />
        <CompareReasonList
          reasons={competitor.chooseCompetitor}
          title={`Pick ${competitor.name} if`}
        />
      </div>
    </section>
  );
}

export function CompareAdvantages({ competitor }: CompareCompetitorProps) {
  return (
    <section className={COMPARE_SECTION_CLASS}>
      <h2
        className={cn(
          COMPARE_SECTION_HEADING_CLASS,
          "flex flex-wrap items-center gap-x-3 gap-y-2"
        )}
      >
        Why teams pick
        <span className="inline-flex items-center gap-3">
          <CompareLogoTile logo={NOTRA_COMPARE_LOGO} size="sm" />
          Notra
        </span>
        over
        <span className="inline-flex items-center gap-3">
          <CompareLogoTile logo={competitor.logo} size="sm" />
          {competitor.name}
        </span>
      </h2>
      <ol
        className={cn(
          "grid grid-cols-1 gap-4",
          competitor.advantages.length === 3
            ? "lg:grid-cols-3"
            : "md:grid-cols-2"
        )}
      >
        {competitor.advantages.map((advantage, index) => (
          <NumberedStepCard
            body={advantage.description}
            key={advantage.title}
            number={String(index + 1)}
            title={advantage.title}
          />
        ))}
      </ol>
    </section>
  );
}

export function CompareStrengths({ competitor }: CompareCompetitorProps) {
  return (
    <section className={COMPARE_SECTION_CLASS}>
      <h2 className={COMPARE_SECTION_HEADING_CLASS}>
        What {competitor.name} does well
      </h2>
      <div className="grid grid-cols-1 gap-x-10 gap-y-7 md:grid-cols-2">
        {competitor.strengths.map((strength) => (
          <div
            className="flex flex-col gap-2 border-t border-[#1E1E1E1A] pt-5 dark:border-white/10"
            key={strength.title}
          >
            <h3 className="font-sans text-base font-semibold text-[#1E1E1E] dark:text-white">
              {strength.title}
            </h3>
            <p className={COMPARE_BODY_CLASS}>{strength.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComparePlanCard({
  name,
  plans,
  note,
  highlight = false,
}: ComparePlanCardProps) {
  return (
    <div
      className={cn(COMPARE_CARD_CLASS, highlight && COMPARE_NOTRA_CARD_CLASS)}
    >
      <h3 className={COMPARE_CARD_HEADING_CLASS}>{name}</h3>
      <dl className="flex flex-col">
        {plans.map((plan) => (
          <div
            className={cn(
              "flex flex-col gap-1 border-t py-3.5 first:border-t-0 first:pt-0 dark:border-white/10",
              highlight ? "border-[#C8B2EE80]" : "border-[#1E1E1E14]"
            )}
            key={plan.name}
          >
            <dt className="flex items-baseline justify-between gap-4 font-sans text-[0.9375rem] font-semibold text-[#1E1E1E] dark:text-white">
              <span>{plan.name}</span>
              <span className={cn("shrink-0", highlight && "text-primary")}>
                {plan.price}
              </span>
            </dt>
            <dd className={COMPARE_BODY_CLASS}>{plan.detail}</dd>
          </div>
        ))}
      </dl>
      <p className={cn(COMPARE_NOTE_CLASS, "mt-auto")}>{note}</p>
    </div>
  );
}

export function ComparePricing({ competitor }: CompareCompetitorProps) {
  return (
    <section className={COMPARE_SECTION_CLASS}>
      <h2 className={COMPARE_SECTION_HEADING_CLASS}>Pricing side by side</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ComparePlanCard
          highlight
          name="Notra"
          note={NOTRA_PRICING_NOTE}
          plans={NOTRA_COMPARE_PLANS}
        />
        <ComparePlanCard
          name={competitor.name}
          note={competitor.pricingNote}
          plans={competitor.plans}
        />
      </div>
    </section>
  );
}

export function CompareRelated({ related }: CompareRelatedProps) {
  return (
    <section className={COMPARE_SECTION_CLASS}>
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-sans text-[1.75rem] leading-[1.21] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
          Other comparisons
        </h2>
        <Link
          className="text-primary shrink-0 font-sans text-[0.9375rem] font-medium"
          to={COMPARE_PATH}
        >
          View all
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((item) => (
          <li key={item.slug}>
            <Link
              className="focus-visible:ring-primary flex items-center gap-3 rounded-2xl bg-white p-3 font-sans text-[0.9375rem] font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] transition-[box-shadow] outline-none hover:[box-shadow:#E0E0E0_0_0_0_0.0625rem,#28282814_0_0.25rem_1rem] focus-visible:ring-2 dark:bg-white/[0.02] dark:text-white dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]"
              to={getCompareHref(item)}
            >
              <CompareLogoTile logo={item.logo} size="sm" />
              {getCompareTitle(item)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompareCorrection({ competitor }: CompareCompetitorProps) {
  return (
    <section className={COMPARE_SECTION_CLASS}>
      <div className="flex flex-col gap-5 rounded-[1.25rem] border border-dashed border-[#1E1E1E26] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 dark:border-white/15">
        <div className="flex max-w-[40rem] flex-col gap-2">
          <h2 className="font-sans text-lg font-semibold text-[#1E1E1E] dark:text-white">
            {getCompareCorrectionHeading(competitor)}
          </h2>
          <p className={COMPARE_BODY_CLASS}>
            {getCompareCorrectionBody(competitor)}
          </p>
          <p className={COMPARE_NOTE_CLASS}>{COMPARE_DISCLAIMER}</p>
        </div>
        <CtaButton
          className="w-full shrink-0 sm:w-auto"
          nativeButton={false}
          render={<Link to={COMPARE_CORRECTION_HREF} />}
          variant="light"
        >
          {COMPARE_CORRECTION_LABEL}
        </CtaButton>
      </div>
    </section>
  );
}
