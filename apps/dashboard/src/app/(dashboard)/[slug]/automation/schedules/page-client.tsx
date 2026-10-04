"use client";

import {
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
  MoreVerticalIcon,
  PauseIcon,
  PlayCircleIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Kbd } from "@notra/ui/components/ui/kbd";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFormatter, useNow, useTranslations } from "use-intl";

import { BrandVoiceCell } from "@/components/automation/brand-voice-cell";
import { OnboardingSuggestions } from "@/components/automation/onboarding-suggestions";
import { CreateScheduleDialog } from "@/components/automation/schedules/create-schedule-dialog";
import { ScheduleQuickStart } from "@/components/automation/schedules/schedule-quick-start";
import { SourcesCell } from "@/components/automation/sources-cell";
import { TriggerStatusBadge } from "@/components/automation/triggers/trigger-status-badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { useCreateFromSuggestion } from "@/lib/hooks/use-onboarding";
import { useOutputTypeLabel } from "@/lib/hooks/use-output-type-label";
import { useScheduleFrequencyLabel } from "@/lib/hooks/use-schedule-frequency-label";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SchedulePresetId } from "@/types/automation/schedule";
import type { BrandSettings } from "@/types/hooks/brand-analysis";
import type { Trigger } from "@/types/triggers/triggers";
import { indexBrandVoices } from "@/utils/brand-voices";
import { latest } from "@/utils/latest-date";
import { getOrpcErrorDataCode } from "@/utils/orpc-errors";
import { OutputTypeIcon } from "@/utils/output-types";
import { tableHeightFor } from "@/utils/table";
import { countEnabled } from "@/utils/trigger-status";

import { SchedulePageSkeleton } from "./skeleton";

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const t = useTranslations("automation.schedules.page");
  const tAutomationShared = useTranslations("automation.shared");
  const tCommon2 = useTranslations("common");
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "paused">("active");
  const [deleteTriggerId, setDeleteTriggerId] = useState<string | null>(null);
  const [editTrigger, setEditTrigger] = useState<Trigger | null>(null);
  const [createdSortOrder, setCreatedSortOrder] = useState<
    false | "asc" | "desc"
  >(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPresetId, setCreatePresetId] = useState<SchedulePresetId | null>(
    null
  );
  const { beginCreate, cancelCreate, handleCreateSuccess, pendingSuggestion } =
    useCreateFromSuggestion(organizationId);

  useHotkey("C", () => setCreateOpen(true), { enabled: !createOpen });

  const { data, isPending } = useQuery(
    dashboardOrpc.automation.schedules.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const repositoryMap = data?.repositoryMap ?? {};

  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const { brandVoiceMap, defaultBrandVoice } = indexBrandVoices(
    brandResponse?.voices
  );

  const updateMutation = useMutation({
    mutationFn: async (trigger: Trigger) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      const cronConfig = trigger.sourceConfig.cron;
      if (!cronConfig) {
        throw new Error("Invalid schedule configuration");
      }

      if (trigger.outputType === "investor_update") {
        throw new Error("Unsupported schedule output");
      }

      const lookbackWindow = trigger.lookbackWindow ?? "last_7_days";
      const outputConfig = trigger.outputConfig ?? {};

      return dashboardOrpc.automation.schedules.update.call({
        organizationId,
        triggerId: trigger.id,
        name: trigger.name,
        sourceType: "cron",
        sourceConfig: { cron: cronConfig },
        targets: trigger.targets,
        outputType: trigger.outputType,
        lookbackWindow,
        outputConfig,
        enabled: !trigger.enabled,
        autoPublish: trigger.autoPublish,
      });
    },
    onError: (error) => {
      if (getOrpcErrorDataCode(error) === "INTEGRATION_NOT_FOUND") {
        toast.error(t("integrationDeleted"));
      } else {
        toast.error(tAutomationShared("failedToUpdateSchedule"));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.schedules.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.onboarding.get.queryKey({
            input: { organizationId },
          }),
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return dashboardOrpc.automation.schedules.delete.call({
        organizationId,
        triggerId,
      });
    },
    onMutate: async (triggerId) => {
      await queryClient.cancelQueries({
        queryKey: dashboardOrpc.automation.schedules.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });

      const previousData = queryClient.getQueryData<{
        triggers: Trigger[];
        repositoryMap: Record<string, string>;
      }>(
        dashboardOrpc.automation.schedules.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        })
      );

      queryClient.setQueryData<{
        triggers: Trigger[];
        repositoryMap: Record<string, string>;
      }>(
        dashboardOrpc.automation.schedules.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
        (old) => {
          if (!old) {
            return old;
          }
          return {
            triggers: old.triggers.filter((t) => t.id !== triggerId),
            repositoryMap: old.repositoryMap,
          };
        }
      );

      return { previousData };
    },
    onError: (_error, _triggerId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          dashboardOrpc.automation.schedules.list.queryKey({
            input: { organizationId: organizationId ?? "" },
          }),
          context.previousData
        );
      }
      toast.error(t("deleteFailed"));
    },
    onSuccess: () => {
      toast.success(t("removed"));
      setDeleteTriggerId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.schedules.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.onboarding.get.queryKey({
            input: { organizationId },
          }),
        });
      }
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      if (!organizationId) {
        throw new Error(tCommon2("labels.organizationIdIsRequired"));
      }

      return dashboardOrpc.automation.schedules.runNow.call({
        organizationId,
        triggerId,
      });
    },
    onSuccess: () => {
      toast.success(t("triggered"));
      if (organizationId) {
        const key = dashboardOrpc.content.activeGenerations.list.queryKey({
          input: { organizationId },
        });
        queryClient.invalidateQueries({ queryKey: key });
        setTimeout(
          () => queryClient.invalidateQueries({ queryKey: key }),
          5000
        );
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("runFailed"));
    },
  });

  const triggers = data?.triggers ?? [];
  const scheduleTriggers = triggers.filter(
    (trigger) => trigger.sourceType === "cron"
  );

  const filteredTriggers = scheduleTriggers.filter((trigger) =>
    activeTab === "active" ? trigger.enabled : !trigger.enabled
  );

  const activeCounts = countEnabled(scheduleTriggers);

  const handleToggle = (trigger: Trigger) => updateMutation.mutate(trigger);

  const handleDelete = (id: string) => {
    setDeleteTriggerId(id);
  };

  const handleEdit = (trigger: Trigger) => {
    setEditTrigger(trigger);
  };

  const confirmDelete = () => {
    if (deleteTriggerId) {
      deleteMutation.mutate(deleteTriggerId);
    }
  };

  const handleRunNow = (triggerId: string) => runNowMutation.mutate(triggerId);

  const triggerToDelete = deleteTriggerId
    ? triggers.find((t) => t.id === deleteTriggerId)
    : null;
  const deleteTriggerRepositoryNames = triggerToDelete
    ? triggerToDelete.targets.repositoryIds.map((id) => repositoryMap[id] ?? id)
    : [];

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon2("labels.schedules")}
        >
          <CreateScheduleDialog
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                setCreatePresetId(null);
                cancelCreate(pendingSuggestion);
              }
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: dashboardOrpc.automation.schedules.list.queryKey({
                  input: { organizationId: organizationId ?? "" },
                }),
              });
              if (organizationId) {
                queryClient.invalidateQueries({
                  queryKey: dashboardOrpc.onboarding.get.queryKey({
                    input: { organizationId },
                  }),
                });
              }
              handleCreateSuccess(pendingSuggestion);
            }}
            open={createOpen}
            organizationId={organizationId ?? ""}
            presetId={createPresetId}
            trigger={
              <Button className="w-fit gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon className="size-4" icon={Add01Icon} />
                  {t("create")}
                </span>
                <Kbd className="hidden sm:inline-flex">C</Kbd>
              </Button>
            }
          />
        </PageHeading>

        {organizationId && (
          <OnboardingSuggestions
            onCreate={(suggestionId) => {
              beginCreate(suggestionId);
              setCreateOpen(true);
            }}
            organizationId={organizationId}
            type="schedule_automation"
          />
        )}

        <SchedulesPageBody
          activeCounts={activeCounts}
          brandVoiceMap={brandVoiceMap}
          createdSortOrder={createdSortOrder}
          defaultBrandVoice={defaultBrandVoice}
          filteredTriggers={filteredTriggers}
          isDeleting={deleteMutation.isPending}
          isPending={isPending}
          isRunning={runNowMutation.isPending}
          isUpdating={updateMutation.isPending}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onEmptyCreateSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: dashboardOrpc.automation.schedules.list.queryKey({
                input: { organizationId: organizationId ?? "" },
              }),
            });
            if (organizationId) {
              queryClient.invalidateQueries({
                queryKey: dashboardOrpc.onboarding.get.queryKey({
                  input: { organizationId },
                }),
              });
            }
          }}
          onRunNow={handleRunNow}
          onSelectPreset={(presetId) => {
            setCreatePresetId(presetId);
            setCreateOpen(true);
          }}
          onSortCreatedChange={setCreatedSortOrder}
          onTabChange={setActiveTab}
          onToggle={handleToggle}
          organizationId={organizationId}
          repositoryMap={repositoryMap}
          runningTriggerId={
            runNowMutation.isPending ? runNowMutation.variables : undefined
          }
          scheduleTriggers={scheduleTriggers}
          updatingTriggerId={
            updateMutation.isPending ? updateMutation.variables?.id : undefined
          }
        />
      </div>

      <ScheduleDeleteDialog
        deleteTriggerRepositoryNames={deleteTriggerRepositoryNames}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleteTriggerId(null)}
        open={!!deleteTriggerId}
        triggerToDelete={triggerToDelete}
      />

      {editTrigger && (
        <CreateScheduleDialog
          editTrigger={editTrigger}
          onOpenChange={(open) => !open && setEditTrigger(null)}
          onSuccess={() => {
            setEditTrigger(null);
            queryClient.invalidateQueries({
              queryKey: dashboardOrpc.automation.schedules.list.queryKey({
                input: { organizationId: organizationId ?? "" },
              }),
            });
            if (organizationId) {
              queryClient.invalidateQueries({
                queryKey: dashboardOrpc.onboarding.get.queryKey({
                  input: { organizationId },
                }),
              });
            }
          }}
          open={!!editTrigger}
          organizationId={organizationId ?? ""}
        />
      )}
    </PageContainer>
  );
}

function SchedulesPageBody({
  activeCounts,
  brandVoiceMap,
  createdSortOrder,
  defaultBrandVoice,
  filteredTriggers,
  isDeleting,
  isPending,
  isRunning,
  isUpdating,
  onDelete,
  onEdit,
  onEmptyCreateSuccess,
  onRunNow,
  onSelectPreset,
  onSortCreatedChange,
  onTabChange,
  onToggle,
  organizationId,
  repositoryMap,
  runningTriggerId,
  scheduleTriggers,
  updatingTriggerId,
}: {
  activeCounts: { active: number; paused: number };
  brandVoiceMap: Record<string, BrandSettings>;
  createdSortOrder: false | "asc" | "desc";
  defaultBrandVoice?: BrandSettings;
  filteredTriggers: Trigger[];
  isDeleting: boolean;
  isPending: boolean;
  isRunning: boolean;
  isUpdating: boolean;
  onDelete: (triggerId: string) => void;
  onEdit: (trigger: Trigger) => void;
  onEmptyCreateSuccess: () => void;
  onRunNow: (triggerId: string) => void;
  onSelectPreset: (presetId: SchedulePresetId) => void;
  onSortCreatedChange: (next: false | "asc" | "desc") => void;
  onTabChange: (tab: "active" | "paused") => void;
  onToggle: (trigger: Trigger) => void;
  organizationId?: string;
  repositoryMap: Record<string, string>;
  runningTriggerId?: string;
  scheduleTriggers: Trigger[];
  updatingTriggerId?: string;
}) {
  const t = useTranslations("automation.schedules.page");
  const tAutomationShared = useTranslations("automation.shared");
  if (isPending) {
    return <SchedulePageSkeleton />;
  }

  return (
    <>
      {scheduleTriggers.length === 0 ? (
        <EmptyState
          action={
            <CreateScheduleDialog
              onSuccess={onEmptyCreateSuccess}
              organizationId={organizationId ?? ""}
              trigger={
                <Button className="gap-1.5" variant="outline">
                  <HugeiconsIcon className="size-4" icon={Add01Icon} />
                  {t("create")}
                </Button>
              }
            />
          }
          description={t("emptyDescription")}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.schedule}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={t("emptyTitle")}
        />
      ) : null}
      <ScheduleQuickStart onSelect={onSelectPreset} />
      {scheduleTriggers.length > 0 ? (
        <Tabs
          defaultValue="active"
          onValueChange={(value) => onTabChange(value as "active" | "paused")}
        >
          <TabsList variant="line">
            <TabsTrigger value="active">
              {tAutomationShared("activeCount", { count: activeCounts.active })}
            </TabsTrigger>
            <TabsTrigger value="paused">
              {tAutomationShared("pausedCount", { count: activeCounts.paused })}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4" value="active">
            <ScheduleTable
              brandVoiceMap={brandVoiceMap}
              createdSortOrder={createdSortOrder}
              defaultBrandVoice={defaultBrandVoice}
              isDeleting={isDeleting}
              isRunning={isRunning}
              isUpdating={isUpdating}
              onDelete={onDelete}
              onEdit={onEdit}
              onRunNow={onRunNow}
              onSortCreatedChange={onSortCreatedChange}
              onToggle={onToggle}
              repositoryMap={repositoryMap}
              runningTriggerId={runningTriggerId}
              triggers={filteredTriggers}
              updatingTriggerId={updatingTriggerId}
            />
          </TabsContent>

          <TabsContent className="mt-4" value="paused">
            <ScheduleTable
              brandVoiceMap={brandVoiceMap}
              createdSortOrder={createdSortOrder}
              defaultBrandVoice={defaultBrandVoice}
              isDeleting={isDeleting}
              isRunning={isRunning}
              isUpdating={isUpdating}
              onDelete={onDelete}
              onEdit={onEdit}
              onRunNow={onRunNow}
              onSortCreatedChange={onSortCreatedChange}
              onToggle={onToggle}
              repositoryMap={repositoryMap}
              runningTriggerId={runningTriggerId}
              triggers={filteredTriggers}
              updatingTriggerId={updatingTriggerId}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </>
  );
}

function ScheduleDeleteDialog({
  deleteTriggerRepositoryNames,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  triggerToDelete,
}: {
  deleteTriggerRepositoryNames: string[];
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  triggerToDelete: Trigger | null | undefined;
}) {
  const t = useTranslations("automation.schedules.page");
  const tCommon = useTranslations("common.actions");
  const formatFrequency = useScheduleFrequencyLabel();
  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {t("deleteTitle")}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {t.rich("deleteDescription", {
              target: () =>
                triggerToDelete ? (
                  <Tooltip>
                    <TooltipTrigger className="text-foreground cursor-help font-medium wrap-anywhere underline decoration-dotted underline-offset-2">
                      {triggerToDelete.name}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs" side="top">
                      <div className="space-y-1 text-xs wrap-anywhere">
                        <p>
                          {t("runs", {
                            value: formatFrequency(
                              triggerToDelete.sourceConfig.cron
                            ),
                          })}
                        </p>
                        <p>
                          {t("repositories", {
                            value: deleteTriggerRepositoryNames.join(", "),
                          })}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  t("thisSchedule")
                ),
            })}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            {tCommon("cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            variant="destructive"
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {tCommon("deleting")}
              </>
            ) : (
              tCommon("delete")
            )}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

const SCHEDULE_TABLE_ROW_HEIGHT = 48;

function ScheduleTable({
  triggers,
  repositoryMap,
  brandVoiceMap,
  createdSortOrder,
  defaultBrandVoice,
  onSortCreatedChange,
  onToggle,
  onDelete,
  onEdit,
  onRunNow,
  isUpdating,
  isDeleting,
  isRunning,
  updatingTriggerId,
  runningTriggerId,
  loading = false,
}: {
  triggers: Trigger[];
  repositoryMap: Record<string, string>;
  brandVoiceMap: Record<string, BrandSettings>;
  createdSortOrder: false | "asc" | "desc";
  defaultBrandVoice?: BrandSettings;
  onSortCreatedChange: (next: false | "asc" | "desc") => void;
  onToggle: (trigger: Trigger) => void;
  onDelete: (triggerId: string) => void;
  onEdit: (trigger: Trigger) => void;
  onRunNow: (triggerId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isRunning: boolean;
  updatingTriggerId?: string;
  runningTriggerId?: string;
  loading?: boolean;
}) {
  const t = useTranslations("automation.schedules.page");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const formatFrequency = useScheduleFrequencyLabel();
  const outputTypeLabel = useOutputTypeLabel();
  const columns: TableColumn<Trigger>[] = [
    {
      key: "name",
      header: tCommon2("labels.name"),
      width: "1fr",
      minWidth: "4rem",
      cell: (trigger) => (
        <TruncateWithTooltip className="text-sm font-medium">
          {trigger.name ?? t("untitled")}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "schedule",
      header: tCommon2("labels.schedule"),
      width: "10rem",
      cell: (trigger) => (
        <TruncateWithTooltip className="text-muted-foreground">
          {formatFrequency(trigger.sourceConfig.cron)}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "identity",
      header: tCommon2("labels.identity"),
      width: "5.5rem",
      cell: (trigger) => {
        const explicitBrandVoiceId = trigger.outputConfig?.brandVoiceId;
        const brandVoice = explicitBrandVoiceId
          ? brandVoiceMap[explicitBrandVoiceId]
          : defaultBrandVoice;
        return (
          <span className="text-muted-foreground">
            <BrandVoiceCell
              isDefault={!explicitBrandVoiceId}
              voice={brandVoice}
            />
          </span>
        );
      },
    },
    {
      key: "output",
      header: tCommon2("labels.output"),
      width: "8.5rem",
      cell: (trigger) => (
        <span className="text-muted-foreground flex items-center gap-1.5">
          <OutputTypeIcon
            className="size-3.5"
            outputType={trigger.outputType}
          />
          {outputTypeLabel(trigger.outputType)}
        </span>
      ),
    },
    {
      key: "sources",
      header: tCommon2("labels.sources"),
      width: "5.5rem",
      cell: (trigger) => (
        <span className="text-muted-foreground">
          <SourcesCell
            repositoryIds={trigger.targets.repositoryIds}
            repositoryMap={repositoryMap}
          />
        </span>
      ),
    },
    {
      key: "status",
      header: tCommon2("labels.status"),
      width: "5rem",
      cell: (trigger) => <TriggerStatusBadge enabled={trigger.enabled} />,
    },
    {
      key: "createdAt",
      header: tCommon2("labels.created"),
      sortable: true,
      sortValue: (trigger) => new Date(trigger.createdAt).getTime(),
      width: "6.5rem",
      cell: (trigger) => (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {format.relativeTime(
            new Date(trigger.createdAt),
            latest(now, trigger.createdAt)
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "3.5rem",
      minWidth: "3.5rem",
      cell: (trigger) => {
        const isThisUpdating = isUpdating && updatingTriggerId === trigger.id;
        const isThisRunning = isRunning && runningTriggerId === trigger.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={tCommon2("labels.actionsForName", {
                    name: trigger.name ?? t("scheduleFallback"),
                  })}
                  disabled={isThisUpdating || isThisRunning}
                  size="icon"
                  variant="ghost"
                >
                  {isThisUpdating || isThisRunning ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <HugeiconsIcon
                      className="text-muted-foreground size-4"
                      icon={MoreVerticalIcon}
                    />
                  )}
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(trigger)}>
                <HugeiconsIcon className="size-4" icon={Edit02Icon} />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isRunning || !trigger.enabled}
                onClick={() => onRunNow(trigger.id)}
              >
                <HugeiconsIcon className="size-4" icon={PlayCircleIcon} />
                {tCommon2("labels.runNow")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isUpdating}
                onClick={() => onToggle(trigger)}
              >
                <HugeiconsIcon
                  className="size-4"
                  icon={trigger.enabled ? PauseIcon : PlayIcon}
                />
                {trigger.enabled ? tCommon2("labels.pause") : tCommon("enable")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isDeleting}
                onClick={() => onDelete(trigger.id)}
                variant="destructive"
              >
                <HugeiconsIcon className="size-4" icon={Delete02Icon} />
                {tCommon("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={triggers}
      emptyState={t("emptyCategory")}
      getRowId={(trigger) => trigger.id}
      height={tableHeightFor(triggers.length, SCHEDULE_TABLE_ROW_HEIGHT)}
      loading={loading}
      onSortChange={(next) => onSortCreatedChange(next?.direction ?? false)}
      rowHeight={SCHEDULE_TABLE_ROW_HEIGHT}
      sort={
        createdSortOrder
          ? { key: "createdAt", direction: createdSortOrder }
          : null
      }
    />
  );
}
