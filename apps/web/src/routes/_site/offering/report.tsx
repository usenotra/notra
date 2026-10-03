import { createFileRoute, redirect } from "@tanstack/react-router";

import { OfferingReport } from "@/components/offering-check/offering-report";
import { OFFERING_CHECK_FORM_PATH } from "@/constants/offering-check";
import {
  offeringCheckRequestSchema,
  offeringReportSearchSchema,
} from "@/schemas/offering-check";
import { buildHead } from "@/utils/head";

export const Route = createFileRoute("/_site/offering/report")({
  validateSearch: offeringReportSearchSchema,
  beforeLoad: ({ search }) => {
    const parsed = offeringCheckRequestSchema.safeParse(search);
    if (!parsed.success) {
      throw redirect({ to: OFFERING_CHECK_FORM_PATH });
    }
    return { input: parsed.data };
  },
  head: ({ match }) =>
    buildHead({
      title: `Does AI know ${match.context.input.feature || match.context.input.domain}?`,
      robots: { index: false, follow: true },
    }),
  component: OfferingReportPage,
});

function OfferingReportPage() {
  const { input } = Route.useRouteContext();

  return (
    <section className="flex w-full flex-col items-center gap-10 pb-16 antialiased [font-synthesis:none] md:gap-12 md:pb-24">
      <OfferingReport input={input} key={JSON.stringify(input)} />
    </section>
  );
}
