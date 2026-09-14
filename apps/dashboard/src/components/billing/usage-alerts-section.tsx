"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

import { UsageAlertForm } from "@/components/billing/usage-alert-form";
import { Button } from "@/components/button";
import { SidebarSwap } from "@/components/dashboard/sidebar-swap";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  UsageAlert,
  UsageAlertsSectionProps,
  UsageAlertsView,
} from "@/types/billing/usage-alerts";
import { usageAlertThresholdLabel } from "@/utils/usage-alerts";

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
  const [view, setView] = useState<UsageAlertsView>("list");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
      toast.success("Usage alerts updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update usage alerts"
      );
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
  let alertsContent: ReactNode;

  function showList() {
    setView("list");
    requestAnimationFrame(() => addAlertButtonRef.current?.focus());
  }

  function showCreateForm() {
    setEditingIndex(null);
    setView("form");
  }

  function showEditForm(index: number) {
    setEditingIndex(index);
    setView("form");
  }

  function saveFormAlert(alert: UsageAlert) {
    const nextAlerts =
      editingIndex === null
        ? [...alerts, alert]
        : alerts.map((item, index) => (index === editingIndex ? alert : item));
    return saveAlerts(nextAlerts);
  }

  if (loading) {
    alertsContent = <Skeleton className="h-20 w-full rounded-xl" />;
  } else if (alerts.length === 0) {
    alertsContent = (
      <div className="text-muted-foreground flex min-h-20 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm">
        No usage alerts configured.
      </div>
    );
  } else {
    alertsContent = (
      <div className="border-border/80 border-b-border/40 bg-muted/80 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert, index) => {
              const configuredFeature = alert.featureId
                ? features.find((feature) => feature.id === alert.featureId)
                : undefined;
              const featureName = alert.featureId
                ? (configuredFeature?.name ?? alert.featureId)
                : "All features";
              const rowLabel = alert.name || `${featureName} usage alert`;

              return (
                <TableRow
                  className="group relative cursor-pointer"
                  key={`${alert.featureId ?? "all"}-${alert.name ?? "unnamed"}-${alert.thresholdType}-${alert.threshold}`}
                >
                  <TableCell className="max-w-56 font-medium whitespace-normal">
                    <button
                      className="focus-visible:after:ring-ring text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset"
                      onClick={() => showEditForm(index)}
                      type="button"
                    >
                      {rowLabel}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {featureName}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {usageAlertThresholdLabel(alert)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.enabled ? "success" : "secondary"}>
                      {alert.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="relative z-10 flex items-center justify-end gap-2">
                      <Switch
                        aria-label={`${alert.enabled ? "Disable" : "Enable"} ${rowLabel}`}
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
                        aria-label={`Delete ${rowLabel}`}
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
                    Usage alerts
                  </h2>
                  <p className="text-muted-foreground max-w-prose text-sm text-pretty">
                    Trigger an alert when usage or the remaining balance crosses
                    a threshold.
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  disabled={controlsDisabled}
                  onClick={showCreateForm}
                  ref={addAlertButtonRef}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Add alert
                </Button>
              </div>

              {alertsContent}

              {!(membersLoading || isOwner) ? (
                <p className="text-muted-foreground text-xs">
                  Only the organization owner can manage usage alerts.
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
              initialAlert={
                editingIndex === null ? undefined : alerts[editingIndex]
              }
              key={editingIndex ?? "create"}
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
