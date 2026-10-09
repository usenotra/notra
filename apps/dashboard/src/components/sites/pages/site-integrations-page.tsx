"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { siteIntegrationSchemas } from "@notra/sites-core/schemas/site-integrations";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import Link from "@/components/framework/link";
import { useSite } from "@/components/sites/site-context";
import { SiteIntegrationDialog } from "@/components/sites/site-integration-dialog";
import { SiteIntegrationRow } from "@/components/sites/site-integration-row";
import { SITE_INTEGRATION_PROVIDERS } from "@/constants/site-integrations";
import {
  useSaveSiteIntegration,
  useSiteIntegrations,
} from "@/lib/hooks/use-site-integrations";
import type { SiteIntegrationName } from "@/types/site-integrations";
import { toErrorMessage } from "@/utils/error-message";
import { siteIntegrationSettings } from "@/utils/site-integrations";
import { siteHref } from "@/utils/site-links";

export function SiteIntegrationsPage() {
  const t = useTranslations("sites.integrationsPage");
  const { organizationId, organizationSlug, siteId } = useSite();
  const scope = { organizationId, siteId };
  const query = useSiteIntegrations(scope);
  const save = useSaveSiteIntegration(scope);
  const [openId, setOpenId] = useState<SiteIntegrationName | null>(null);
  const open = SITE_INTEGRATION_PROVIDERS.find(
    (provider) => provider.id === openId
  );

  return (
    <div className="flex flex-1 flex-col gap-6" data-site-fill>
      <PageHeading description={t("description")} title={t("title")} />

      <p className="text-muted-foreground text-sm">{t("previewDescription")}</p>

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("loadFailed")}</AlertTitle>
          <AlertDescription>
            <p>{toErrorMessage(query.error, t("loadFailed"))}</p>
            <Button
              disabled={query.isFetching}
              onClick={() => query.refetch()}
              size="sm"
              variant="outline"
            >
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {query.data?.invalid ? (
        <Alert variant="warning">
          <HugeiconsIcon
            aria-hidden="true"
            icon={Alert02Icon}
            strokeWidth={1.5}
          />
          <AlertTitle>{t("invalidTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("invalidDescription")}</p>
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={siteHref(organizationSlug, siteId, "editor")}
            >
              {t("openEditor")}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-x-6 gap-y-1 lg:grid-cols-2">
        {query.isPending
          ? SITE_INTEGRATION_PROVIDERS.map((provider) => (
              <div className="flex items-center gap-4 p-3" key={provider.id}>
                <Skeleton className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-56 max-w-full" />
                </div>
              </div>
            ))
          : SITE_INTEGRATION_PROVIDERS.map((provider) => (
              <SiteIntegrationRow
                isSetUp={
                  siteIntegrationSchemas[provider.id].safeParse(
                    query.data?.integrations[provider.id]
                  ).success
                }
                disabled={query.isError || save.isPending}
                key={provider.id}
                onOpen={() => setOpenId(provider.id)}
                onRemove={() =>
                  save.mutate(
                    { provider: provider.id, settings: null },
                    {
                      onSuccess: () =>
                        toast.success(t("removed"), {
                          description: t("savedDescription"),
                        }),
                      onError: (error) =>
                        toast.error(toErrorMessage(error, t("saveFailed"))),
                    }
                  )
                }
                provider={provider}
              />
            ))}
      </div>

      {query.data?.hasDraft ? (
        <div className="pointer-events-none sticky bottom-4 z-10 mt-auto flex justify-center">
          <div className="bg-background/90 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 pointer-events-auto flex max-w-full min-w-0 flex-col items-stretch gap-3 rounded-xl border p-3 shadow-lg backdrop-blur motion-safe:duration-200 sm:flex-row sm:items-center sm:gap-6 sm:py-2 sm:pr-2 sm:pl-4">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="bg-warning size-1.5 shrink-0 rounded-full"
              />
              {t("draftDescription")}
            </p>
            <Link
              className={buttonVariants({ size: "sm" })}
              href={siteHref(organizationSlug, siteId, "editor")}
            >
              {t("reviewAndPublish")}
            </Link>
          </div>
        </div>
      ) : null}

      {open ? (
        <SiteIntegrationDialog
          key={open.id}
          onOpenChange={(next) => {
            if (!next) {
              setOpenId(null);
            }
          }}
          open
          provider={open}
          scope={scope}
          settings={siteIntegrationSettings(query.data?.integrations, open)}
        />
      ) : null}
    </div>
  );
}
