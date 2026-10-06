"use client";

import { Add01Icon, Refresh03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { BRAND_IDENTITY_TAB_LABEL_KEYS } from "@/constants/brand-identity";
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
  const t = useTranslations("brand.identity.header");
  const tBrandShared = useTranslations("brand.shared");
  const tLabels = useTranslations("common.labels");
  const actionByTab: Partial<
    Record<BrandTab, { label: string; onClick: () => void }>
  > = {
    identity: {
      label: tBrandShared("createIdentity"),
      onClick: onAddIdentity,
    },
    references: {
      label: tBrandShared("addReference"),
      onClick: onAddReference,
    },
    sitemap: {
      label: tBrandShared("addSitemap"),
      onClick: onAddSitemap,
    },
  };
  const action = actionByTab[activeTab];

  return (
    <PageHeading
      description={t(`tabs.${activeTab}.description`)}
      title={tLabels(BRAND_IDENTITY_TAB_LABEL_KEYS[activeTab])}
    >
      {activeTab === "guidelines" ? (
        <Button loading={isRefreshingGuidelines} onClick={onRefreshGuidelines}>
          <HugeiconsIcon className="size-4" icon={Refresh03Icon} />
          {tBrandShared("refreshGuidelines")}
        </Button>
      ) : null}
      {action ? (
        <Button onClick={action.onClick}>
          <HugeiconsIcon className="size-4" icon={Add01Icon} />
          {action.label}
          <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
        </Button>
      ) : null}
    </PageHeading>
  );
}
