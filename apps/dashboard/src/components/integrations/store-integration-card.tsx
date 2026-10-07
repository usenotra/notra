"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  IntegrationCardDither,
  useIntegrationCardDither,
} from "@/components/integrations/integration-card-dither";
import { StoreIntegrationLogo } from "@/components/integrations/store-integration-logo";
import { MCP_ACCENT_COLOR } from "@/lib/integrations/mcp";
import type { StoreIntegrationCardProps } from "@/types/integrations/mcp";

export function StoreIntegrationCard({
  integration,
  connectPending,
  onConnect,
  onManage,
}: StoreIntegrationCardProps) {
  const t = useTranslations("integrations.store");
  const tCommon = useTranslations("common");
  const dither = useIntegrationCardDither();

  return (
    <TitleCard
      {...dither.interactionProps}
      accentColor={integration.brandColor ?? MCP_ACCENT_COLOR}
      action={
        integration.connected ? (
          <div className="flex items-center gap-2">
            <Badge className="text-xs" variant="default">
              {t("connected")}
            </Badge>
            <span className="text-muted-foreground">
              <HugeiconsIcon
                aria-hidden="true"
                className="size-4"
                icon={MoreHorizontalIcon}
              />
              <span className="sr-only">
                {tCommon("labels.manageIntegration")}
              </span>
            </span>
          </div>
        ) : (
          <Button
            disabled={connectPending}
            onClick={() => onConnect(integration)}
            size="sm"
            variant="outline"
          >
            {connectPending ? t("connecting") : tCommon("actions.connect")}
          </Button>
        )
      }
      className={
        integration.connected
          ? "hover:bg-muted/80 h-full cursor-pointer transition-colors"
          : "h-full"
      }
      heading={integration.name}
      hoverBackground={
        <IntegrationCardDither
          active={dither.active}
          color={integration.brandColor ?? MCP_ACCENT_COLOR}
        />
      }
      icon={<StoreIntegrationLogo integration={integration} />}
      onClick={() => {
        if (integration.connected) {
          onManage(integration);
        }
      }}
      onKeyDown={(event) => {
        if (
          integration.connected &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onManage(integration);
        }
      }}
      role={integration.connected ? "button" : undefined}
      tabIndex={integration.connected ? 0 : undefined}
    >
      <p className="text-muted-foreground line-clamp-2 text-sm">
        {integration.description ??
          (integration.author
            ? t("byAuthor", { author: integration.author })
            : t("fallbackDescription"))}
      </p>
    </TitleCard>
  );
}
