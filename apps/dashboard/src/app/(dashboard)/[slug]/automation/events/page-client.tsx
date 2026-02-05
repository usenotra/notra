"use client";

import { Button } from "@notra/ui/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { Github } from "@notra/ui/components/ui/svgs/github";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { Trigger, TriggerSourceType } from "@/types/triggers";
import { getOutputTypeLabel } from "@/utils/output-types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { AddTriggerDialog } from "../../triggers/trigger-dialog";
import { TriggerRowActions } from "../_components/trigger-row-actions";
import { TriggerStatusBadge } from "../_components/trigger-status-badge";
import { EventsPageSkeleton } from "./skeleton";

const COMING_SOON = true;

const EVENT_SOURCE_TYPES: TriggerSourceType[] = ["github_webhook"];

function formatEventList(events?: string[]) {
  if (!events || events.length === 0) {
    return "All events";
  }
  return events.map((event) => event.replace("_", " ")).join(", ");
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
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

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/organizations/${organizationId}/automation/events`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch triggers");
      }

      return response.json() as Promise<{ triggers: Trigger[] }>;
    },
    enabled: !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: async (trigger: Trigger) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await fetch(
        `/api/organizations/${organizationId}/automation/events?triggerId=${trigger.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: trigger.sourceType,
            sourceConfig: trigger.sourceConfig,
            targets: trigger.targets,
            outputType: trigger.outputType,
            outputConfig: trigger.outputConfig,
            enabled: !trigger.enabled,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update trigger");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
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
      const response = await fetch(
        `/api/organizations/${organizationId}/automation/events?triggerId=${triggerId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete trigger");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
      });
      toast.success("Event trigger removed");
    },
    onError: () => {
      toast.error("Failed to delete trigger");
    },
  });

  const triggers = data?.triggers ?? [];
  const eventTriggers = useMemo(
    () => triggers.filter((trigger) => trigger.sourceType === "github_webhook"),
    [triggers]
  );

  const filteredTriggers = useMemo(() => {
    return eventTriggers.filter((t) =>
      activeTab === "active" ? t.enabled : !t.enabled
    );
  }, [eventTriggers, activeTab]);

  const activeCounts = useMemo(() => {
    let active = 0;
    let paused = 0;
    for (const t of eventTriggers) {
      if (t.enabled) {
        active++;
      } else {
        paused++;
      }
    }
    return { active, paused };
  }, [eventTriggers]);

  const handleToggle = useCallback(
    (trigger: Trigger) => updateMutation.mutate(trigger),
    [updateMutation]
  );

  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  );

  if (COMING_SOON) {
    return (
      <PageContainer
        className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
        variant="compact"
      >
        <div className="w-full px-4 lg:px-6">
          <div className="relative min-h-125">
            <div className="pointer-events-none blur-sm">
              <div className="mb-6 space-y-1">
                <h1 className="font-bold text-3xl tracking-tight">
                  Automation Events
                </h1>
                <p className="text-muted-foreground">
                  React to GitHub activity and trigger content generation
                  automatically.
                </p>
              </div>
              <div className="space-y-8">
                <div className="h-12 w-64 rounded-lg border bg-muted/20" />
                <div className="h-64 w-full rounded-lg border bg-muted/20" />
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="w-full max-w-md border-border/50 shadow-xs">
                <CardHeader className="text-center">
                  <CardTitle>Coming Soon</CardTitle>
                  <CardDescription>
                    Event-based automation triggers are currently in
                    development. Stay tuned!
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">
              Automation Events
            </h1>
            <p className="text-muted-foreground">
              React to GitHub activity and trigger content generation
              automatically.
            </p>
          </div>
          <AddTriggerDialog
            allowedSourceTypes={EVENT_SOURCE_TYPES}
            apiPath={
              organizationId
                ? `/api/organizations/${organizationId}/automation/events`
                : undefined
            }
            initialSourceType="github_webhook"
            onSuccess={() =>
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AUTOMATION.events(organizationId ?? ""),
              })
            }
            organizationId={organizationId ?? ""}
            trigger={
              <Button size="sm" variant="default">
                <PlusIcon className="size-4" />
                <span className="ml-1">New Event Trigger</span>
              </Button>
            }
          />
        </div>

        {isPending ? (
          <EventsPageSkeleton />
        ) : eventTriggers.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <h3 className="font-semibold text-lg">No event triggers yet</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              Create your first event trigger to react to GitHub activity.
            </p>
            <div className="mt-4">
              <AddTriggerDialog
                allowedSourceTypes={EVENT_SOURCE_TYPES}
                apiPath={
                  organizationId
                    ? `/api/organizations/${organizationId}/automation/events`
                    : undefined
                }
                initialSourceType="github_webhook"
                onSuccess={() =>
                  queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.AUTOMATION.events(
                      organizationId ?? ""
                    ),
                  })
                }
                organizationId={organizationId ?? ""}
                trigger={
                  <Button size="sm" variant="outline">
                    <PlusIcon className="size-4" />
                    <span className="ml-1">Add event trigger</span>
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <Tabs
            defaultValue="active"
            onValueChange={(value) =>
              setActiveTab(value as "active" | "paused")
            }
          >
            <TabsList variant="line">
              <TabsTrigger value="active">
                Active ({activeCounts.active})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({activeCounts.paused})
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4" value="active">
              <EventTable
                onDelete={handleDelete}
                onToggle={handleToggle}
                triggers={filteredTriggers}
              />
            </TabsContent>

            <TabsContent className="mt-4" value="paused">
              <EventTable
                onDelete={handleDelete}
                onToggle={handleToggle}
                triggers={filteredTriggers}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageContainer>
  );
}

function EventTable({
  triggers,
  onToggle,
  onDelete,
}: {
  triggers: Trigger[];
  onToggle: (trigger: Trigger) => void;
  onDelete: (triggerId: string) => void;
}) {
  if (triggers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        No event triggers in this category.
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Events</TableHead>
            <TableHead>Output</TableHead>
            <TableHead>Targets</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {triggers.map((trigger) => (
            <TableRow key={trigger.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/50">
                    <Github className="size-4" />
                  </span>
                  <span className="text-sm">GitHub webhook</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatEventList(trigger.sourceConfig.eventTypes)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {getOutputTypeLabel(trigger.outputType)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {trigger.targets.repositoryIds.length} repositories
              </TableCell>
              <TableCell>
                <TriggerStatusBadge enabled={trigger.enabled} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(trigger.createdAt)}
              </TableCell>
              <TableCell>
                <TriggerRowActions
                  onDelete={onDelete}
                  onToggle={onToggle}
                  trigger={trigger}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
