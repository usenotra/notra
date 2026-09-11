"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import { ALL_INTEGRATIONS } from "@/lib/integrations/catalog";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { IntegrationsSettingsRowProps } from "@/types/settings/integrations";

function IntegrationsSettingsRow({
  connectedCount,
  integration,
  onManage,
}: IntegrationsSettingsRowProps) {
  const status =
    connectedCount > 0 ? `${connectedCount} connected` : "Not connected";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="border-border/60 bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border [&_svg]:size-5">
        {integration.icon}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">{integration.name}</p>
        <p className="text-muted-foreground truncate text-xs">{status}</p>
      </div>
      <Button onClick={onManage} size="sm" type="button" variant="outline">
        {connectedCount > 0 ? "Manage" : "Connect"}
      </Button>
    </div>
  );
}

export function IntegrationsSettingsPane() {
  const router = useRouter();
  const { closeSettings } = useSettingsModal();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const organizationSlug = activeOrganization?.slug ?? "";

  const integrationsQuery = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: Boolean(organizationId),
    })
  );
  const connected = integrationsQuery.data?.integrations ?? [];

  function openIntegration(href: string) {
    if (!organizationSlug) {
      return;
    }
    closeSettings();
    router.push(`/${organizationSlug}/integrations/${href}`);
  }

  function openIntegrationsHub() {
    if (!organizationSlug) {
      return;
    }
    closeSettings();
    router.push(`/${organizationSlug}/integrations`);
  }

  let integrationsList: ReactNode = ALL_INTEGRATIONS.filter(
    (integration) => integration.available
  ).map((integration) => (
    <IntegrationsSettingsRow
      connectedCount={
        connected.filter((item) => item.type === integration.id && item.enabled)
          .length
      }
      integration={integration}
      key={integration.id}
      onManage={() => openIntegration(integration.href)}
    />
  ));
  if (integrationsQuery.isLoading) {
    integrationsList = (
      <>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
        </div>
      </>
    );
  } else if (integrationsQuery.isError && !integrationsQuery.data) {
    integrationsList = (
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
        role="alert"
      >
        <p className="text-sm">Unable to load integrations.</p>
        <Button
          onClick={() => integrationsQuery.refetch()}
          size="sm"
          type="button"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <SettingsPane>
      <p className="text-muted-foreground text-sm leading-relaxed">
        GitHub, Linear, and other connections live on their own pages. Open one
        below to connect accounts, pick repositories, and manage draft pull
        requests.
      </p>
      <div className="bg-muted/40 divide-y rounded-xl">{integrationsList}</div>
      <Button className="w-fit" onClick={openIntegrationsHub} variant="ghost">
        Browse all integrations
        <HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
      </Button>
    </SettingsPane>
  );
}
