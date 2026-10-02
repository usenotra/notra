import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import {
  buildDetailMetaTail,
  buildDetailStats,
} from "@/lib/integrations/helpers";
import type { IntegrationDetailViewProps } from "@/types/integrations";
import { getIntegrationReferralUrl } from "@/utils/integration-referral-url";

import { IntegrationAuthorMeta } from "./integration-author-meta";
import { IntegrationBanner } from "./integration-banner";
import { IntegrationConnectButton } from "./integration-connect-button";
import { IntegrationLogo } from "./integration-logo";
import { IntegrationToolsGrid } from "./integration-tools-grid";

export function IntegrationDetailView({
  integration,
}: IntegrationDetailViewProps) {
  const stats = buildDetailStats(integration);

  return (
    <div className="flex w-full flex-col items-center pb-14">
      <div className="flex w-[min(100%-3rem,64rem)] flex-col gap-8 pt-24 lg:pt-28">
        <Link
          className="inline-flex w-max cursor-pointer items-center gap-1.5 font-sans text-[0.875rem] leading-[1.29] font-medium whitespace-nowrap text-[#1E1E1E80] transition-colors hover:text-[#1E1E1E] dark:text-white/50 dark:hover:text-white"
          to="/integrations"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          <span>All integrations</span>
        </Link>

        <IntegrationBanner
          className="h-[15rem] w-full rounded-[1.25rem] sm:h-[21.25rem]"
          integration={integration}
          priority
        />

        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3.5">
            <span className="flex size-15 shrink-0 items-center justify-center overflow-clip rounded-2xl bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] dark:bg-white/[0.06] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
              <IntegrationLogo fill integration={integration} size={60} />
            </span>
            <div className="flex min-w-0 grow flex-col gap-1">
              <h1 className="font-sans text-[2.375rem] leading-[1.16] font-semibold tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
                {integration.name}
              </h1>
              <IntegrationAuthorMeta
                className="font-sans text-[0.9375rem] leading-[1.33] tracking-[-0.01em] text-[#1E1E1EA6] dark:text-white/60"
                integration={integration}
                tail={buildDetailMetaTail(integration)}
              />
            </div>
            <div className="flex items-center gap-3">
              {integration.websiteUrl ? (
                <a
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-5.5 py-2.75 font-sans text-[0.875rem] leading-[1.29] font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] transition-colors hover:bg-[#FAFAFA] dark:bg-white/[0.08] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem] dark:hover:bg-white/[0.12]"
                  href={getIntegrationReferralUrl(integration.websiteUrl)}
                  rel="noopener"
                  target="_blank"
                >
                  Website
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
                </a>
              ) : null}
              <IntegrationConnectButton
                className="px-6.5 py-2.75 text-[0.875rem] leading-[1.29]"
                integration={integration}
              />
            </div>
          </div>

          {integration.description ? (
            <p className="font-sans text-[1rem] leading-[1.56] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/70">
              {integration.description}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
            {stats.map((stat) => (
              <div
                className="flex flex-col gap-0.5 rounded-2xl px-5.5 py-4.5 [box-shadow:#ECECEC_0_0_0_0.0625rem] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]"
                key={stat.label}
              >
                <span className="font-sans text-[0.75rem] leading-[1.33] font-medium tracking-[0.04em] text-[#1E1E1E80] dark:text-white/50">
                  {stat.label}
                </span>
                <span className="font-sans text-[1.125rem] leading-[1.33] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <IntegrationToolsGrid
            tools={integration.tools}
            totalCount={integration.indexedToolCount}
          />
        </div>
      </div>
    </div>
  );
}
