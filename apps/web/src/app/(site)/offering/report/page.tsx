import { Effect } from "effect";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OfferingReport } from "@/components/offering-check/offering-report";
import { OFFERING_CHECK_FORM_PATH } from "@/constants/offering-check";
import { readCachedOfferingCheck } from "@/lib/offering-check/cache";
import { offeringCheckRequestSchema } from "@/schemas/offering-check";
import type { OfferingReportPageProps } from "@/types/offering-check";

async function parseInput(
  searchParams: OfferingReportPageProps["searchParams"]
) {
  const { domain, feature, description } = await searchParams;
  const parsed = offeringCheckRequestSchema.safeParse({
    domain,
    feature,
    description,
  });
  return parsed.success ? parsed.data : null;
}

export async function generateMetadata({
  searchParams,
}: OfferingReportPageProps): Promise<Metadata> {
  const input = await parseInput(searchParams);
  return {
    title: input
      ? `Does AI know ${input.feature || input.domain}?`
      : "Does AI Know Your Features?",
    robots: { index: false, follow: true },
  };
}

export default async function OfferingReportPage({
  searchParams,
}: OfferingReportPageProps) {
  const input = await parseInput(searchParams);
  if (!input) {
    redirect(OFFERING_CHECK_FORM_PATH);
  }
  const initialResult = await Effect.runPromise(readCachedOfferingCheck(input));

  return (
    <section className="flex w-full flex-col items-center gap-10 pb-16 antialiased [font-synthesis:none] md:gap-12 md:pb-24">
      <OfferingReport
        initialResult={initialResult}
        input={input}
        key={`${input.domain}:${input.feature}:${input.description}`}
      />
    </section>
  );
}
