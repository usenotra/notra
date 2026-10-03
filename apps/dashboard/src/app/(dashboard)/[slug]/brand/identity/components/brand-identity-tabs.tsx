"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useTranslations } from "use-intl";

import type { BrandIdentityTabsProps, BrandTab } from "@/types/brand-identity";

import { BrandForm } from "./brand-form";
import { GuidelinesPanel } from "./guidelines-panel";
import { ReferencesList } from "./references-list";
import { SitemapList } from "./sitemap-list";

export function BrandIdentityTabs({
  activeTab,
  addReferenceOpen,
  addSitemapOpen,
  initialData,
  isSaving,
  onActiveTabChange,
  onAddReferenceOpenChange,
  onAddSitemapOpenChange,
  onSavingChange,
  organizationId,
  voiceId,
  voiceWebsiteUrl,
}: BrandIdentityTabsProps) {
  const t = useTranslations("brand.identity.tabs");
  const tCommon = useTranslations("common");
  const tStates = useTranslations("common.actions");
  return (
    <Tabs
      onValueChange={(value) => onActiveTabChange(value as BrandTab)}
      value={activeTab}
    >
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0 overflow-x-auto pb-2">
          <TabsList variant="line">
            <TabsTrigger value="identity">
              {tCommon("labels.companyInfo")}
            </TabsTrigger>
            <TabsTrigger value="guidelines">{t("guidelines")}</TabsTrigger>
            <TabsTrigger value="references">
              {tCommon("labels.references")}
            </TabsTrigger>
            <TabsTrigger value="sitemap">
              {tCommon("labels.sitemap")}
            </TabsTrigger>
          </TabsList>
        </div>
        {activeTab === "identity" && isSaving ? (
          <span
            aria-live="polite"
            className="text-muted-foreground shrink-0 text-xs"
            role="status"
          >
            {tStates("saving")}
          </span>
        ) : null}
      </div>

      <TabsContent className="mt-6" value="identity">
        <BrandForm
          initialData={initialData}
          key={voiceId}
          onSavingChange={onSavingChange}
          organizationId={organizationId}
          voiceId={voiceId}
        />
      </TabsContent>

      <TabsContent className="mt-6" value="guidelines">
        <GuidelinesPanel
          key={`guidelines-${voiceId}`}
          organizationId={organizationId}
          voiceId={voiceId}
        />
      </TabsContent>

      <TabsContent className="mt-6" value="references">
        <ReferencesList
          dialogOpen={addReferenceOpen}
          key={`refs-${voiceId}`}
          onDialogOpenChange={onAddReferenceOpenChange}
          organizationId={organizationId}
          voiceId={voiceId}
        />
      </TabsContent>

      <TabsContent className="mt-6" value="sitemap">
        <SitemapList
          dialogOpen={addSitemapOpen}
          key={`sitemap-${voiceId}`}
          onDialogOpenChange={onAddSitemapOpenChange}
          organizationId={organizationId}
          voiceId={voiceId}
          voiceWebsiteUrl={voiceWebsiteUrl}
        />
      </TabsContent>
    </Tabs>
  );
}
