"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/utils/query-keys";

const BrandCrawlerModal = dynamic(
  () =>
    import("@/components/settings/brand-crawler-modal").then((mod) => ({
      default: mod.BrandCrawlerModal,
    })),
  { ssr: false }
);

type BrandSettings = {
  id: string;
  organizationId: string;
  websiteUrl: string | null;
  companyName: string | null;
  companyDescription: string | null;
  toneProfile: string | null;
  customTone: string | null;
  audience: string | null;
  crawlerStatus: string | null;
  crawlerLastRun: string | null;
  crawlerError: string | null;
};

type PageClientProps = {
  organizationSlug: string;
};

function BrandSettingsCard({
  brandSettings,
  isLoading,
  onCrawlWebsite,
}: {
  brandSettings: BrandSettings | null | undefined;
  isLoading: boolean;
  onCrawlWebsite: () => void;
}) {
  const { activeOrganization } = useOrganizationsContext();
  const hasWebsite = !!(
    activeOrganization?.website || brandSettings?.websiteUrl
  );
  const hasBrandData = !!(
    brandSettings?.companyName || brandSettings?.companyDescription
  );
  const isCrawling = brandSettings?.crawlerStatus === "crawling";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <CardAction>
            <Skeleton className="h-9 w-32 rounded-md" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex-1 space-y-1">
          <CardTitle>Brand Settings</CardTitle>
          <CardDescription>
            Your brand identity helps the AI generate content that matches your
            voice and audience
          </CardDescription>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            {isCrawling ? (
              <Badge variant="secondary">Analyzing...</Badge>
            ) : hasBrandData ? (
              <Badge variant="default">Configured</Badge>
            ) : (
              <Badge variant="outline">Not configured</Badge>
            )}
            <Button
              disabled={isCrawling}
              onClick={onCrawlWebsite}
              size="sm"
              variant="outline"
            >
              {hasWebsite
                ? hasBrandData
                  ? "Update Brand"
                  : "Analyze Website"
                : "Add Website"}
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {hasBrandData ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium text-sm">Company Name</p>
              <p className="text-muted-foreground text-sm">
                {brandSettings?.companyName}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Description</p>
              <p className="text-muted-foreground text-sm">
                {brandSettings?.companyDescription}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium text-sm">Tone</p>
                <p className="text-muted-foreground text-sm">
                  {brandSettings?.toneProfile || "Not set"}
                  {brandSettings?.customTone
                    ? ` - ${brandSettings.customTone}`
                    : ""}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">Target Audience</p>
                <p className="text-muted-foreground text-sm">
                  {brandSettings?.audience || "Not set"}
                </p>
              </div>
            </div>
            {brandSettings?.crawlerLastRun ? (
              <p className="text-muted-foreground text-xs">
                Last analyzed:{" "}
                {new Date(brandSettings.crawlerLastRun).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground text-sm">
              {hasWebsite
                ? "Click 'Analyze Website' to generate your brand profile from your website content"
                : "Add your website to let AI analyze and generate your brand profile"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const [crawlerModalOpen, setCrawlerModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: brandSettings, isLoading } = useQuery({
    queryKey: QUERY_KEYS.BRAND_SETTINGS.detail(organizationId || ""),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/organizations/${organizationId}/brand-settings`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch brand settings");
      }

      return response.json() as Promise<BrandSettings>;
    },
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Please select an organization to view settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace settings and brand identity
          </p>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-4 font-semibold text-lg">Workspace</h2>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <div className="flex-1 space-y-1">
                    <CardTitle>General Information</CardTitle>
                    <CardDescription>
                      Basic information about your workspace
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Name</p>
                      <p className="text-muted-foreground text-sm">
                        {activeOrganization?.name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Slug</p>
                      <p className="text-muted-foreground text-sm">
                        {activeOrganization?.slug}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Website</p>
                      <p className="text-muted-foreground text-sm">
                        {activeOrganization?.website || "Not set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-lg">Brand Identity</h2>
            <div className="grid gap-4">
              <BrandSettingsCard
                brandSettings={brandSettings}
                isLoading={isLoading}
                onCrawlWebsite={() => setCrawlerModalOpen(true)}
              />
            </div>
          </section>
        </div>
      </div>

      <BrandCrawlerModal
        onOpenChange={setCrawlerModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.BRAND_SETTINGS.detail(organizationId),
          });
        }}
        open={crawlerModalOpen}
        organizationId={organizationId}
        websiteUrl={
          activeOrganization?.website || brandSettings?.websiteUrl || ""
        }
      />
    </div>
  );
}
