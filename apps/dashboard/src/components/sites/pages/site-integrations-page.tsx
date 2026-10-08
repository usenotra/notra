"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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

import { buttonVariants } from "@/components/button";
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

      {query.data?.invalid ? (
        <Alert variant="warning">
          <HugeiconsIcon
            aria-hidden="true"
            icon={Alert02Icon}
            strokeWidth={1.5}
          />
          <AlertTitle>{t("invalidTitle")}</AlertTitle>
          <AlertDescription>{t("invalidDescription")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-x-6 gap-y-1 lg:grid-cols-2">
        {query.isPending
          ? SITE_INTEGRATION_PROVIDERS.map((provider) => (
              <div className="flex items-center gap-4 p-3" key={provider.id}>
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-56" />
                </div>
              </div>
            ))
          : SITE_INTEGRATION_PROVIDERS.map((provider) => (
              <SiteIntegrationRow
                isSetUp={
                  siteIntegrationSettings(
                    query.data?.integrations,
                    provider
                  ) !== null
                }
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
          <div className="bg-background/90 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 pointer-events-auto flex max-w-full items-center gap-6 rounded-xl border py-2 pr-2 pl-4 shadow-lg backdrop-blur motion-safe:duration-200">
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
