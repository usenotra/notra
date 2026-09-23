"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";

import type { BrandIdentityTabsProps, BrandTab } from "@/types/brand-identity";

import { BrandForm } from "./brand-form";
import { GuidelinesPanel } from "./guidelines-panel";
import { KnowledgePanel } from "./knowledge-panel";
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
  return (
    <Tabs
      onValueChange={(value) => onActiveTabChange(value as BrandTab)}
      value={activeTab}
    >
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0 overflow-x-auto pb-2">
          <TabsList variant="line">
            <TabsTrigger value="identity">Company Info</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          </TabsList>
        </div>
        {activeTab === "identity" && isSaving ? (
          <span
            aria-live="polite"
            className="text-muted-foreground shrink-0 text-xs"
            role="status"
          >
            Saving…
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

      <TabsContent className="mt-6" value="knowledge">
        <KnowledgePanel
          key={`knowledge-${voiceId}`}
          organizationId={organizationId}
          voiceId={voiceId}
          voiceWebsiteUrl={voiceWebsiteUrl}
        />
      </TabsContent>
    </Tabs>
  );
}
