import { CompareCustomerLogos } from "@/components/compare/compare-customer-logos";
import {
  CompareAdvantages,
  CompareAtAGlance,
  CompareCorrection,
  CompareHero,
  ComparePricing,
  CompareRelated,
  CompareShortAnswer,
  CompareStrengths,
} from "@/components/compare/compare-sections";
import { CompareTable } from "@/components/compare/compare-table";
import { CtaBanner } from "@/components/landing/cta-banner";
import { FaqSection } from "@/components/landing/faq-section";
import {
  COMPARE_BODY_CLASS,
  COMPARE_SECTION_CLASS,
  COMPARE_SECTION_HEADING_CLASS,
} from "@/constants/compare/classes";
import { COMPARE_SIGNUP_SOURCE } from "@/constants/compare/page";
import type { CompareDetailViewProps } from "@/types/compare";
import { getCompareFaqContent } from "@/utils/compare";

export function CompareDetailView({
  competitor,
  related,
}: CompareDetailViewProps) {
  const signupSource = `${COMPARE_SIGNUP_SOURCE}_${competitor.slug}`;

  return (
    <div className="flex w-full flex-col items-center gap-20 pb-14 lg:gap-24">
      <CompareHero competitor={competitor} signupSource={signupSource} />
      <CompareCustomerLogos />
      <CompareAtAGlance competitor={competitor} />
      <CompareShortAnswer competitor={competitor} />
      <section className={COMPARE_SECTION_CLASS}>
        <div className="flex flex-col gap-3">
          <h2 className={COMPARE_SECTION_HEADING_CLASS}>Feature by feature</h2>
          <p className={`${COMPARE_BODY_CLASS} max-w-[40rem] text-[1.0625rem]`}>
            Every engine and feature we could verify on both sides, including
            the ones where {competitor.name} is ahead.
          </p>
        </div>
        <CompareTable competitor={competitor} />
      </section>
      <CompareAdvantages competitor={competitor} />
      <CompareStrengths competitor={competitor} />
      <ComparePricing competitor={competitor} />
      <div className="-my-20 w-full lg:-my-24">
        <FaqSection
          content={getCompareFaqContent(competitor)}
          key={competitor.slug}
        />
      </div>
      <CompareRelated related={related} />
      <CompareCorrection competitor={competitor} />
      <section className="w-full px-6">
        <CtaBanner
          heading={`Try Notra next to ${competitor.name}`}
          signupSource={`${signupSource}_cta`}
          subcopy="Add your prompts, run a scan and compare the answers yourself."
        />
      </section>
    </div>
  );
}
