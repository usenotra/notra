import { Link } from "@tanstack/react-router";

import {
  buildAuthorCategoryLine,
  buildCardMeta,
  getIntegrationSlug,
} from "@/lib/integrations/helpers";
import type { IntegrationCardProps } from "@/types/integrations";

import { IntegrationConnectButton } from "./integration-connect-button";
import { IntegrationLogo } from "./integration-logo";

const CARD_RING =
  "[box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]";

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const brandColor = integration.brandColor ?? "#7C3AED";

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-[1.25rem] bg-white p-5 dark:bg-white/[0.02] ${CARD_RING}`}
    >
      <Link
        aria-label={`View ${integration.name} details`}
        className="focus-visible:ring-primary absolute inset-0 z-0 cursor-pointer rounded-[1.25rem] outline-none focus-visible:ring-2"
        mask={{
          to: "/integrations/$id",
          params: { id: getIntegrationSlug(integration) },
          unmaskOnReload: true,
        }}
        resetScroll={false}
        state={{ integrationModal: getIntegrationSlug(integration) }}
        to="/integrations"
      />
      <div className="pointer-events-none relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span
            className="flex size-11 shrink-0 items-center justify-center overflow-clip rounded-xl"
            style={{ backgroundColor: `${brandColor}14` }}
          >
            <IntegrationLogo fill integration={integration} size={44} />
          </span>
          <IntegrationConnectButton
            className="pointer-events-auto px-3.5 py-1.5 text-[0.8125rem] leading-[1.23]"
            integration={integration}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[1.0625rem] leading-[1.29] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
            {integration.name}
          </span>
          <span className="font-sans text-[0.8125rem] leading-[1.31] tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
            {buildAuthorCategoryLine(integration)}
          </span>
        </div>
        {integration.description ? (
          <span className="line-clamp-2 font-sans text-[0.8125rem] leading-[1.46] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/70">
            {integration.description}
          </span>
        ) : null}
        <span className="font-sans text-[0.75rem] leading-[1.33] font-medium text-[#1E1E1E80] dark:text-white/50">
          {buildCardMeta(integration)}
        </span>
      </div>
    </div>
  );
}
