"use client";

import {
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteIntegrationLogo } from "@/components/sites/site-integration-logo";
import type { SiteIntegrationRowProps } from "@/types/components/sites";

export function SiteIntegrationRow({
  provider,
  isSetUp,
  onOpen,
  onRemove,
}: SiteIntegrationRowProps) {
  const t = useTranslations("sites.integrationsPage");
  return (
    <div className="group/integration hover:bg-muted/40 duration-fast relative flex items-center gap-4 rounded-xl p-3 transition-colors">
      <SiteIntegrationLogo className="size-11 rounded-xl" provider={provider} />
      <div className="min-w-0 flex-1">
        <button
          className="focus-visible:ring-ring/50 rounded-sm text-left text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-[3px]"
          onClick={onOpen}
          type="button"
        >
          {provider.name}
        </button>
        <p className="text-muted-foreground truncate text-sm">
          {t(`providers.${provider.id}`)}
        </p>
      </div>
      {isSetUp ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={t("more", { provider: provider.name })}
                className="relative"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon
              className="size-4"
              icon={MoreHorizontalIcon}
              strokeWidth={1.5}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onOpen}>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                size={14}
                strokeWidth={1.5}
              />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} />
              {t("remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          aria-label={t("add", { provider: provider.name })}
          className="relative"
          onClick={onOpen}
          size="icon-sm"
          variant="ghost"
        >
          <HugeiconsIcon
            className="size-4"
            icon={PlusSignIcon}
            strokeWidth={1.5}
          />
        </Button>
      )}
    </div>
  );
}
