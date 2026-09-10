"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Github } from "@notra/ui/components/ui/svgs/github";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { BrandVoiceCell } from "@/components/automation/brand-voice-cell";
import { EventsPageSkeleton } from "@/components/automation/events-skeleton";
import { CreateEventTriggerDialog } from "@/components/automation/events/create-event-trigger-dialog";
import { OnboardingSuggestions } from "@/components/automation/onboarding-suggestions";
import { SourcesCell } from "@/components/automation/sources-cell";
import { TriggerRowActions } from "@/components/automation/triggers/trigger-row-actions";
import { TriggerStatusBadge } from "@/components/automation/triggers/trigger-status-badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { Table, type TableColumn } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useCreateFromSuggestion } from "@/lib/hooks/use-onboarding";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { BrandSettings } from "@/types/hooks/brand-analysis";
import type { Trigger } from "@/types/triggers/triggers";
import {
  getDefaultEventTriggerValues,
  isAutomationOutputType,
} from "@/utils/event-trigger-form";
import { getOutputTypeLabel, OutputTypeIcon } from "@/utils/output-types";
import { tableHeightFor } from "@/utils/table";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatEventList(events?: string[]) {
  if (!events || events.length === 0) {
    return "All events";
  }
  return events.map((event) => event.replace("_", " ")).join(", ");
}

function formatDate(dateString: string) {
  return DATE_FORMATTER.format(new Date(dateString));
}

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "paused">("active");
  const [createdSortOrder, setCreatedSortOrder] = useState<
    false | "asc" | "desc"
  >(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTrigger, setEditTrigger] = useState<Trigger | null>(null);
  const { beginCreate, cancelCreate, handleCreateSuccess, pendingSuggestion } =
    useCreateFromSuggestion(organizationId);

  useHotkey("C", () => setCreateOpen(true), { enabled: !createOpen });

  const { data, isPending } = useQuery(
    dashboardOrpc.automation.events.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
      enabled: !!organizationId,
    })
  );

  const brandVoiceMap: Record<string, BrandSettings> = {};
  let defaultBrandVoice: BrandSettings | undefined;
  for (const voice of brandResponse?.voices ?? []) {
    brandVoiceMap[voice.id] = voice;
    if (voice.isDefault) {
      defaultBrandVoice = voice;
    }
  }

  const updateMutation = useMutation({
    mutationFn: async (trigger: Trigger) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const values = getDefaultEventTriggerValues(trigger);
      const outputType = isAutomationOutputType(trigger.outputType)
        ? trigger.outputType
        : values.outputType;

      return dashboardOrpc.automation.events.update.call({
        organizationId,
        triggerId: trigger.id,
        sourceType: "github_webhook",
        sourceConfig: {
          eventTypes: trigger.sourceConfig.eventTypes ?? [values.eventType],
          includePreReleases: trigger.sourceConfig.includePreReleases ?? true,
        },
        targets: trigger.targets,
        outputType,
        outputConfig: trigger.outputConfig ?? {},
        enabled: !trigger.enabled,
        autoPublish: trigger.autoPublish,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.events.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
    },
    onError: () => {
      toast.error("Failed to update trigger");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return dashboardOrpc.automation.events.delete.call({
        organizationId,
        triggerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.events.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      toast.success("Event trigger removed");
    },
    onError: () => {
      toast.error("Failed to delete trigger");
    },
  });

  const eventTriggers =
    data?.triggers.filter(
      (trigger) => trigger.sourceType === "github_webhook"
    ) ?? [];
  const filteredTriggers = eventTriggers.filter((trigger) =>
    activeTab === "active" ? trigger.enabled : !trigger.enabled
  );

  let active = 0;
  let paused = 0;
  for (const trigger of eventTriggers) {
    if (trigger.enabled) {
      active++;
    } else {
      paused++;
    }
  }

  const handleToggle = (trigger: Trigger) => {
    updateMutation.mutate(trigger);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleEdit = (trigger: Trigger) => {
    setEditTrigger(trigger);
  };

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">
              React to GitHub activity and trigger content generation
              automatically
            </p>
          </div>
          <CreateEventTriggerDialog
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                cancelCreate(pendingSuggestion);
              }
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: dashboardOrpc.automation.events.list.queryKey({
                  input: { organizationId: organizationId ?? "" },
                }),
              });
              handleCreateSuccess(pendingSuggestion);
            }}
            open={createOpen}
            organizationId={organizationId ?? ""}
            trigger={
              <Button className="w-fit gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon className="size-4" icon={Add01Icon} />
                  Create Trigger
                </span>
                <Kbd className="hidden sm:inline-flex">C</Kbd>
              </Button>
            }
          />
        </div>

        {organizationId && (
          <OnboardingSuggestions
            onCreate={(suggestionId) => {
              beginCreate(suggestionId);
              setCreateOpen(true);
            }}
            organizationId={organizationId}
            type="event_automation"
          />
        )}

        {isPending && <EventsPageSkeleton />}

        {!isPending && eventTriggers.length === 0 && (
          <EmptyState
            action={
              <CreateEventTriggerDialog
                onSuccess={() =>
                  queryClient.invalidateQueries({
                    queryKey: dashboardOrpc.automation.events.list.queryKey({
                      input: { organizationId: organizationId ?? "" },
                    }),
                  })
                }
                organizationId={organizationId ?? ""}
                trigger={
                  <Button className="gap-1.5" variant="outline">
                    <HugeiconsIcon className="size-4" icon={Add01Icon} />
                    Create Trigger
                  </Button>
                }
              />
            }
            description="Create your first event trigger to react to GitHub activity."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.events}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="No event triggers yet"
          />
        )}

        {!isPending && eventTriggers.length > 0 && (
          <Tabs
            defaultValue="active"
            onValueChange={(value) =>
              setActiveTab(value as "active" | "paused")
            }
          >
            <TabsList variant="line">
              <TabsTrigger value="active">Active ({active})</TabsTrigger>
              <TabsTrigger value="paused">Paused ({paused})</TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4" value="active">
              <EventTable
                brandVoiceMap={brandVoiceMap}
                createdSortOrder={createdSortOrder}
                defaultBrandVoice={defaultBrandVoice}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSortCreatedChange={setCreatedSortOrder}
                onToggle={handleToggle}
                triggers={filteredTriggers}
              />
            </TabsContent>

            <TabsContent className="mt-4" value="paused">
              <EventTable
                brandVoiceMap={brandVoiceMap}
                createdSortOrder={createdSortOrder}
                defaultBrandVoice={defaultBrandVoice}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSortCreatedChange={setCreatedSortOrder}
                onToggle={handleToggle}
                triggers={filteredTriggers}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
      {editTrigger && (
        <CreateEventTriggerDialog
          editTrigger={editTrigger}
          onOpenChange={(open) => !open && setEditTrigger(null)}
          onSuccess={() => {
            setEditTrigger(null);
            queryClient.invalidateQueries({
              queryKey: dashboardOrpc.automation.events.list.queryKey({
                input: { organizationId: organizationId ?? "" },
              }),
            });
          }}
          open={!!editTrigger}
          organizationId={organizationId ?? ""}
        />
      )}
    </PageContainer>
  );
}

function EventTable({
  triggers,
  brandVoiceMap,
  createdSortOrder,
  defaultBrandVoice,
  onSortCreatedChange,
  onToggle,
  onDelete,
  onEdit,
}: {
  triggers: Trigger[];
  brandVoiceMap: Record<string, BrandSettings>;
  createdSortOrder: false | "asc" | "desc";
  defaultBrandVoice?: BrandSettings;
  onSortCreatedChange: (next: false | "asc" | "desc") => void;
  onToggle: (trigger: Trigger) => void;
  onDelete: (triggerId: string) => void;
  onEdit: (trigger: Trigger) => void;
}) {
  const columns: TableColumn<Trigger>[] = [
    {
      key: "sourceType",
      header: "Type",
      width: "1fr",
      minWidth: "13rem",
      cell: () => (
        <div className="flex items-center gap-2">
          <span className="bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-lg border">
            <Github className="size-4" />
          </span>
          <span className="text-sm whitespace-nowrap">GitHub Webhook</span>
        </div>
      ),
    },
    {
      key: "events",
      header: "Events",
      width: "8rem",
      cell: (trigger) => (
        <span className="text-muted-foreground capitalize">
          {formatEventList(trigger.sourceConfig.eventTypes)}
        </span>
      ),
    },
    {
      key: "identity",
      header: "Identity",
      width: "12rem",
      cell: (trigger) => {
        const explicitBrandVoiceId = trigger.outputConfig?.brandVoiceId;
        return (
          <span className="text-muted-foreground">
            <BrandVoiceCell
              isDefault={!explicitBrandVoiceId}
              voice={
                explicitBrandVoiceId
                  ? brandVoiceMap[explicitBrandVoiceId]
                  : defaultBrandVoice
              }
            />
          </span>
        );
      },
    },
    {
      key: "outputType",
      header: "Output",
      width: "10rem",
      cell: (trigger) => (
        <span className="text-muted-foreground flex items-center gap-1.5 capitalize">
          <OutputTypeIcon
            className="size-3.5 shrink-0"
            outputType={trigger.outputType}
          />
          {getOutputTypeLabel(trigger.outputType)}
        </span>
      ),
    },
    {
      key: "sources",
      header: "Sources",
      width: "8rem",
      cell: (trigger) => (
        <span className="text-muted-foreground">
          <SourcesCell repositoryIds={trigger.targets.repositoryIds} />
        </span>
      ),
    },
    {
      key: "enabled",
      header: "Status",
      width: "7rem",
      cell: (trigger) => <TriggerStatusBadge enabled={trigger.enabled} />,
    },
    {
      key: "createdAt",
      header: "Created At",
      width: "10rem",
      sortable: true,
      sortValue: (trigger) => new Date(trigger.createdAt).getTime(),
      cell: (trigger) => (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {formatDate(trigger.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "5rem",
      cell: (trigger) => (
        <TriggerRowActions
          onDelete={onDelete}
          onEdit={onEdit}
          onToggle={onToggle}
          trigger={trigger}
        />
      ),
    },
  ];

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={triggers}
      emptyState="No event triggers in this category."
      getRowId={(trigger) => trigger.id}
      height={tableHeightFor(triggers.length)}
      onSortChange={(sort) => onSortCreatedChange(sort?.direction ?? false)}
      rowHeight={TABLE_ROW_HEIGHT}
      sort={
        createdSortOrder
          ? { key: "createdAt", direction: createdSortOrder }
          : null
      }
    />
  );
}
