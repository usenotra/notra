"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_USAGE_ALERTS } from "@notra/schemas/constants/usage-alerts";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { UsageAlertForm } from "@/components/billing/usage-alert-form";
import { Button } from "@/components/button";
import { SidebarSwap } from "@/components/dashboard/sidebar-swap";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import { useUsageFeatureName } from "@/lib/hooks/use-usage-feature-name";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  UsageAlert,
  UsageAlertsSectionProps,
  UsageAlertsView,
} from "@/types/billing/usage-alerts";
import { usageAlertIdentity, usageAlertsEqual } from "@/utils/usage-alerts";

interface MemberRow {
  role: string;
  userId: string;
}

export function UsageAlertsSection({
  alerts,
  features,
  loading,
  onUpdated,
}: UsageAlertsSectionProps) {
  const t = useTranslations("billing.usageAlerts");
  const tCommon = useTranslations("common");
  const tStates = useTranslations("common.states");
  const featureNameOf = useUsageFeatureName();
  const [view, setView] = useState<UsageAlertsView>("list");
  const [editingAlert, setEditingAlert] = useState<UsageAlert | null>(null);
  const addAlertButtonRef = useRef<HTMLButtonElement>(null);
  const { activeOrganization } = useOrganizationsContext();
  const { data: session } = authClient.useSession();
  const { data: membersData, isPending: membersLoading } = useQuery({
    queryKey: ["members", activeOrganization?.id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.listMembers({
        query: { organizationId: activeOrganization?.id },
      });
      if (error) {
        throw new Error("Failed to fetch members");
      }
      return data;
    },
    enabled: Boolean(activeOrganization?.id),
  });
  const members = (membersData?.members ?? []) as MemberRow[];
  const isOwner = members.some(
    (member) => member.userId === session?.user?.id && member.role === "owner"
  );

  const mutation = useMutation({
    mutationFn: async (nextAlerts: UsageAlert[]) =>
      dashboardOrpc.usageAlerts.update.call({
        organizationId: activeOrganization?.id ?? "",
        alerts: nextAlerts,
      }),
    onSuccess: async () => {
      await onUpdated();
      toast.success(t("updated"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
    },
  });

  async function saveAlerts(nextAlerts: UsageAlert[]) {
    try {
      await mutation.mutateAsync(nextAlerts);
      return true;
    } catch {
      return false;
    }
  }

  const controlsDisabled = membersLoading || !isOwner || mutation.isPending;
  const atAlertLimit = alerts.length >= MAX_USAGE_ALERTS;
  let alertsContent: ReactNode;

  function showList() {
    setView("list");
    requestAnimationFrame(() => addAlertButtonRef.current?.focus());
  }

  function showCreateForm() {
    setEditingAlert(null);
    setView("form");
  }

  function showEditForm(alert: UsageAlert) {
    setEditingAlert({ ...alert });
    setView("form");
  }

  async function saveFormAlert(alert: UsageAlert) {
    if (editingAlert === null) {
      if (atAlertLimit) {
        toast.error(t("limitToast", { max: MAX_USAGE_ALERTS }));
        return false;
      }
      return saveAlerts([...alerts, alert]);
    }

    const currentIndex = alerts.findIndex((item) =>
      usageAlertsEqual(item, editingAlert)
    );
    if (currentIndex === -1) {
      toast.error(t("changed"));
      return false;
    }

    const nextAlerts = alerts.map((item, index) =>
      index === currentIndex ? alert : item
    );
    return saveAlerts(nextAlerts);
  }

  if (loading) {
    alertsContent = <Skeleton className="h-20 w-full rounded-xl" />;
  } else if (alerts.length === 0) {
    alertsContent = (
      <div className="text-muted-foreground flex min-h-20 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm">
        {t("empty")}
      </div>
    );
  } else {
    alertsContent = (
      <div className="border-border/80 border-b-border/40 bg-muted/80 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.alert")}</TableHead>
              <TableHead>{t("feature")}</TableHead>
              <TableHead>{t("threshold")}</TableHead>
              <TableHead className="w-28">{tCommon("labels.status")}</TableHead>
              <TableHead className="w-24 text-right">
                <span className="sr-only">{tCommon("labels.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert, index) => {
              const configuredFeature = alert.featureId
                ? features.find((feature) => feature.id === alert.featureId)
                : undefined;
              let featureName = t("allFeatures");
              if (alert.featureId) {
                featureName = configuredFeature
                  ? featureNameOf(configuredFeature)
                  : alert.featureId;
              }
              const rowLabel =
                alert.name || t("rowLabel", { feature: featureName });

              return (
                <TableRow
                  className={cn(
                    "group relative",
                    !controlsDisabled && "cursor-pointer"
                  )}
                  key={`${alert.featureId ?? "all"}-${alert.name ?? "unnamed"}-${alert.thresholdType}-${alert.threshold}`}
                >
                  <TableCell className="max-w-56 font-medium wrap-anywhere whitespace-normal">
                    <button
                      className="focus-visible:after:ring-ring text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset disabled:pointer-events-none"
                      disabled={controlsDisabled}
                      onClick={() => showEditForm(alert)}
                      type="button"
                    >
                      {rowLabel}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {featureName}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {t("thresholdValue", {
                      threshold: alert.threshold,
                      percentage: alert.thresholdType.endsWith("_percentage")
                        ? "yes"
                        : "no",
                      direction: alert.thresholdType.startsWith("remaining")
                        ? "remaining"
                        : "used",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.enabled ? "success" : "secondary"}>
                      {alert.enabled ? tStates("enabled") : tStates("disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="relative z-10 flex items-center justify-end gap-2">
                      <Switch
                        aria-label={
                          alert.enabled
                            ? t("disableLabel", { label: rowLabel })
                            : t("enableLabel", { label: rowLabel })
                        }
                        checked={alert.enabled}
                        disabled={controlsDisabled}
                        onCheckedChange={(enabled) => {
                          const nextAlerts = alerts.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, enabled } : item
                          );
                          void saveAlerts(nextAlerts);
                        }}
                        size="sm"
                      />
                      <Button
                        aria-label={t("deleteLabel", { label: rowLabel })}
                        disabled={controlsDisabled}
                        onClick={() => {
                          void saveAlerts(
                            alerts.filter((_, itemIndex) => itemIndex !== index)
                          );
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <SidebarSwap
      activeId={view}
      items={[
        {
          id: "list",
          side: "left",
          children: (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {tCommon("labels.usageAlerts")}
                  </h2>
                  <p className="text-muted-foreground max-w-prose text-sm text-pretty">
                    {t("description")}
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  disabled={controlsDisabled || atAlertLimit}
                  onClick={showCreateForm}
                  ref={addAlertButtonRef}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  {t("addAlert")}
                </Button>
              </div>

              {alertsContent}

              {atAlertLimit ? (
                <p className="text-muted-foreground text-xs">
                  {t("limitReached", { max: MAX_USAGE_ALERTS })}
                </p>
              ) : null}

              {!(membersLoading || isOwner) ? (
                <p className="text-muted-foreground text-xs">
                  {t("ownerOnly")}
                </p>
              ) : null}
            </section>
          ),
        },
        {
          id: "form",
          side: "right",
          children: (
            <UsageAlertForm
              features={features}
              initialAlert={editingAlert ?? undefined}
              key={editingAlert ? usageAlertIdentity(editingAlert) : "create"}
              onCancel={showList}
              onSubmit={saveFormAlert}
              pending={mutation.isPending}
            />
          ),
        },
      ]}
    />
  );
}
