import { Link } from "@tanstack/react-router";

import {
  buildAuthorCategoryLine,
  buildFeaturedMeta,
  getIntegrationSlug,
} from "@/lib/integrations/helpers";
import type { FeaturedIntegrationCardProps } from "@/types/integrations";

import { IntegrationBanner } from "./integration-banner";
import { IntegrationConnectButton } from "./integration-connect-button";
import { IntegrationLogo } from "./integration-logo";

const CARD_RING =
  "[box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]";

export function FeaturedIntegrationCard({
  integration,
}: FeaturedIntegrationCardProps) {
  return (
    <div
      className={`relative flex flex-col overflow-clip rounded-3xl bg-white dark:bg-white/[0.02] ${CARD_RING}`}
    >
      <Link
        aria-label={`View ${integration.name} details`}
        className="focus-visible:ring-primary absolute inset-0 z-0 cursor-pointer rounded-3xl outline-none focus-visible:ring-2"
        mask={{
          to: "/integrations/$id",
          params: { id: getIntegrationSlug(integration) },
        }}
        search={(prev) => ({
          ...prev,
          integration: getIntegrationSlug(integration),
        })}
        to="/integrations"
      />
      <div className="pointer-events-none relative z-10 flex flex-col">
        <IntegrationBanner
          className="h-[11.875rem] w-full shrink-0"
          integration={integration}
        />
        <div className="flex flex-col gap-3.5 px-7 pt-6 pb-7">
          <div className="flex items-center justify-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-clip rounded-xl bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:bg-white/[0.06] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
              <IntegrationLogo fill integration={integration} size={44} />
            </span>
            <div className="flex grow flex-col gap-0.5">
              <span className="font-sans text-[1.375rem] leading-[1.18] font-semibold tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
                {integration.name}
              </span>
              <span className="font-sans text-[0.875rem] leading-[1.29] tracking-[-0.01em] text-[#1E1E1EA6] dark:text-white/60">
                {buildAuthorCategoryLine(integration)}
              </span>
            </div>
            <IntegrationConnectButton
              className="pointer-events-auto px-5.5 py-2.5 text-[0.875rem] leading-[1.29]"
              integration={integration}
            />
          </div>
          {integration.description ? (
            <span className="line-clamp-2 font-sans text-[0.9375rem] leading-[1.47] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/70">
              {integration.description}
            </span>
          ) : null}
          <span className="font-sans text-[0.8125rem] leading-[1.38] font-medium tracking-[-0.005em] text-[#1E1E1E80] dark:text-white/50">
            {buildFeaturedMeta(integration)}
          </span>
        </div>
      </div>
    </div>
  );
}
