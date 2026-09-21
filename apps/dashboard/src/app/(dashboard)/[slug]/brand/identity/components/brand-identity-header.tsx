"use client";

import { Add01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/button";
import { BRAND_TAB_HEADERS } from "@/constants/brand-identity";
import type {
  BrandIdentityHeaderProps,
  BrandTab,
} from "@/types/brand-identity";

export function BrandIdentityHeader({
  activeTab,
  onAddIdentity,
  onAddReference,
  onAddSitemap,
  onRefreshGuidelines,
  isRefreshingGuidelines,
}: BrandIdentityHeaderProps) {
  const actionByTab: Partial<
    Record<BrandTab, { label: string; onClick: () => void }>
  > = {
    identity: {
      label: "Create Identity",
      onClick: onAddIdentity,
    },
    references: {
      label: "Add Reference",
      onClick: onAddReference,
    },
    sitemap: {
      label: "Add Sitemap",
      onClick: onAddSitemap,
    },
  };
  const action = actionByTab[activeTab];

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {BRAND_TAB_HEADERS[activeTab].title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          {BRAND_TAB_HEADERS[activeTab].description}
        </p>
      </div>
      {activeTab === "guidelines" ? (
        <Button disabled={isRefreshingGuidelines} onClick={onRefreshGuidelines}>
          {isRefreshingGuidelines ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <HugeiconsIcon className="size-4" icon={RefreshIcon} />
          )}
          Refresh Guidelines
        </Button>
      ) : null}
      {action ? (
        <Button onClick={action.onClick}>
          <HugeiconsIcon className="size-4" icon={Add01Icon} />
          {action.label}
          <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
        </Button>
      ) : null}
    </header>
  );
}
