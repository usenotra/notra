"use client";

import {
  ArrowReloadHorizontalIcon,
  PlusSignIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Card, CardContent } from "@notra/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Input } from "@notra/ui/components/ui/input";
import { Kbd } from "@notra/ui/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { DeleteIntegrationDialog } from "@/components/delete-integration-dialog";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { AddSlackIntegrationDialog } from "@/components/integrations/add-slack-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useSlackConnectionToast } from "@/lib/hooks/use-slack-connection-toast";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SlackIntegrationsPageClientProps } from "@/types/integrations/pages";
import type {
  SlackChannelAccessEditorProps,
  SlackIntegrationCardProps,
  SlackNotificationChannelPickerProps,
  SlackSettingRowProps,
} from "@/types/slack-integration";

import { SlackIntegrationsPageSkeleton } from "./skeleton";

const NO_NOTIFICATION_CHANNEL = "__none__";

function SettingRow({ title, description, children }: SlackSettingRowProps) {
  return (
    <div className="border-border/60 flex flex-col gap-3 border-t py-5 first:border-t-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="w-full sm:max-w-md">{children}</div>
    </div>
  );
}

function useSlackChannels(
  organizationId: string,
  integrationId: string,
  enabled: boolean
) {
  return useQuery(
    dashboardOrpc.integrations.slack.listChannels.queryOptions({
      input: { organizationId, integrationId },
      enabled,
      staleTime: 1000 * 60,
    })
  );
}

function useRefreshSlackChannels(
  organizationId: string,
  integrationId: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.integrations.slack.listChannels.call({
        organizationId,
        integrationId,
        refresh: true,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        dashboardOrpc.integrations.slack.listChannels.queryKey({
          input: { organizationId, integrationId },
        }),
        data
      );
      toast.success("Channel list refreshed");
    },
    onError: () => {
      toast.error("Failed to refresh channels");
    },
  });
}

function RefreshChannelsButton({
  organizationId,
  integrationId,
}: {
  organizationId: string;
  integrationId: string;
}) {
  const refreshMutation = useRefreshSlackChannels(
    organizationId,
    integrationId
  );
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label="Refresh channel list"
            className="text-muted-foreground hover:text-foreground aria-expanded:bg-transparent"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon
          className={
            refreshMutation.isPending ? "size-3.5 animate-spin" : "size-3.5"
          }
          icon={ArrowReloadHorizontalIcon}
        />
      </TooltipTrigger>
      <TooltipContent>Refresh channels from Slack</TooltipContent>
    </Tooltip>
  );
}

function SlackNotificationChannelPicker({
  integration,
  organizationId,
  onUpdate,
}: SlackNotificationChannelPickerProps) {
  const queryClient = useQueryClient();
  const { data: channelData, isLoading } = useSlackChannels(
    organizationId,
    integration.id,
    true
  );

  const saveMutation = useMutation({
    mutationFn: (notificationChannelId: string | null) =>
      dashboardOrpc.integrations.slack.update.call({
        organizationId,
        integrationId: integration.id,
        notificationChannelId,
      }),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.slack.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(
        channelId ? "Notifications channel updated" : "Notifications turned off"
      );
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to update the notifications channel");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-9 w-full max-w-md rounded-md" />;
  }

  const channels = channelData?.channels ?? [];
  const selectedChannel = channels.find(
    (channel) => channel.id === integration.notificationChannelId
  );
  const selectedLabel = integration.notificationChannelId
    ? `#${selectedChannel?.name ?? integration.notificationChannelId}`
    : "Off";

  return (
    <div className="flex items-center gap-1.5">
      <Select
        onValueChange={(value) => {
          saveMutation.mutate(value === NO_NOTIFICATION_CHANNEL ? null : value);
        }}
        value={integration.notificationChannelId ?? NO_NOTIFICATION_CHANNEL}
      >
        <SelectTrigger className="w-full" disabled={saveMutation.isPending}>
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_NOTIFICATION_CHANNEL}>Off</SelectItem>
          {channels.map((channel) => (
            <SelectItem key={channel.id} value={channel.id}>
              #{channel.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <RefreshChannelsButton
        integrationId={integration.id}
        organizationId={organizationId}
      />
    </div>
  );
}

function SlackChannelAccessEditor({
  integration,
  organizationId,
  onUpdate,
}: SlackChannelAccessEditorProps) {
  const queryClient = useQueryClient();
  const restrictedInitially = integration.allowedChannelIds !== null;
  const [isRestricted, setIsRestricted] = useState(restrictedInitially);
  const [search, setSearch] = useState("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(
    () => new Set(integration.allowedChannelIds ?? [])
  );

  const { data: channelData, isLoading } = useSlackChannels(
    organizationId,
    integration.id,
    isRestricted
  );

  const saveMutation = useMutation({
    mutationFn: (allowedChannelIds: string[] | null) =>
      dashboardOrpc.integrations.slack.update.call({
        organizationId,
        integrationId: integration.id,
        allowedChannelIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.slack.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success("Channel access updated");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to update channel access");
    },
  });

  const channels = channelData?.channels ?? [];
  const query = search.trim().toLowerCase();
  const filteredChannels = query
    ? channels.filter((channel) => channel.name.toLowerCase().includes(query))
    : channels;

  const allFilteredSelected =
    filteredChannels.length > 0 &&
    filteredChannels.every((channel) => selectedChannelIds.has(channel.id));

  const toggleAllFiltered = () => {
    setSelectedChannelIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const channel of filteredChannels) {
          next.delete(channel.id);
        }
      } else {
        for (const channel of filteredChannels) {
          next.add(channel.id);
        }
      }
      return next;
    });
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const isDirty =
    isRestricted !== restrictedInitially ||
    (isRestricted &&
      (integration.allowedChannelIds ?? []).length !==
        selectedChannelIds.size) ||
    (isRestricted &&
      (integration.allowedChannelIds ?? []).some(
        (id) => !selectedChannelIds.has(id)
      ));

  return (
    <div>
      <SettingRow
        description="Everyone in your workspace can use the agent. People outside your workspace, including Slack Connect guests, cannot and never will. Optionally limit the agent to specific channels."
        title="Channel access"
      >
        <div className="border-border flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm">Limit to specific channels</p>
            <p className="text-muted-foreground text-xs">
              {isRestricted
                ? `${selectedChannelIds.size} channel${selectedChannelIds.size === 1 ? "" : "s"} selected`
                : "The agent responds anywhere it is mentioned"}
            </p>
          </div>
          <Switch
            checked={isRestricted}
            onCheckedChange={(checked) => setIsRestricted(checked === true)}
          />
        </div>
      </SettingRow>

      {isRestricted && (
        <div className="space-y-3 pb-5">
          <div className="border-border overflow-hidden rounded-lg border">
            <div className="border-border/60 relative flex items-center gap-1.5 border-b pr-1.5 pl-2.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <label className="border-input hover:border-ring has-checked:border-primary has-checked:bg-primary flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-colors">
                      <input
                        aria-label="Select all channels"
                        checked={allFilteredSelected}
                        className="sr-only"
                        onChange={toggleAllFiltered}
                        type="checkbox"
                      />
                    </label>
                  }
                >
                  {allFilteredSelected && (
                    <HugeiconsIcon
                      className="text-primary-foreground size-3"
                      icon={Tick02Icon}
                      strokeWidth={3}
                    />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {allFilteredSelected
                    ? "Deselect all channels"
                    : "Select all channels"}
                </TooltipContent>
              </Tooltip>
              <HugeiconsIcon
                className="text-muted-foreground size-3.5 shrink-0"
                icon={Search01Icon}
              />
              <Input
                className="rounded-none border-0 pl-1 shadow-none focus-visible:ring-0"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search channels..."
                value={search}
              />
              <RefreshChannelsButton
                integrationId={integration.id}
                organizationId={organizationId}
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {isLoading && (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              )}
              {!isLoading && filteredChannels.length === 0 && (
                <p className="text-muted-foreground p-3 text-sm">
                  No channels match.
                </p>
              )}
              {filteredChannels.map((channel) => (
                <button
                  className="hover:bg-accent/50 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors"
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm">#{channel.name}</span>
                    {channel.memberCount !== null && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {channel.memberCount} members
                      </span>
                    )}
                  </span>
                  <Switch
                    checked={selectedChannelIds.has(channel.id)}
                    className="pointer-events-none"
                  />
                </button>
              ))}
            </div>
          </div>

          {isDirty && (
            <div className="flex justify-end">
              <Button
                disabled={
                  saveMutation.isPending ||
                  (isRestricted && selectedChannelIds.size === 0)
                }
                onClick={() =>
                  saveMutation.mutate(
                    isRestricted ? [...selectedChannelIds] : null
                  )
                }
                size="sm"
              >
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlackIntegrationCard({
  integration,
  organizationId,
  onUpdate,
}: SlackIntegrationCardProps) {
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      dashboardOrpc.integrations.slack.update.call({
        organizationId,
        integrationId: integration.id,
        enabled,
      }),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.slack.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(enabled ? "Integration enabled" : "Integration disabled");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to update integration");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.integrations.slack.delete.call({
        organizationId,
        integrationId: integration.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.slack.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success("Integration deleted");
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to delete integration");
    },
  });

  const connectedOn = new Date(integration.createdAt).toLocaleDateString();

  return (
    <>
      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="border-border bg-muted/40 flex size-10 shrink-0 items-center justify-center rounded-lg border">
              <Slack className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{integration.displayName}</p>
              <p className="text-muted-foreground truncate text-sm">
                {integration.createdByUser
                  ? `Connected by ${integration.createdByUser.name} on ${connectedOn}`
                  : `Connected on ${connectedOn}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={integration.enabled ? "default" : "secondary"}>
              {integration.enabled ? "Active" : "Paused"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    disabled={
                      toggleMutation.isPending || deleteMutation.isPending
                    }
                    size="icon-sm"
                    variant="ghost"
                  >
                    <svg
                      aria-label="More options"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>More options</title>
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => toggleMutation.mutate(!integration.enabled)}
                >
                  {integration.enabled ? "Pause" : "Resume"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  variant="destructive"
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardContent className="border-border/60 border-t px-6 pb-2">
          <SlackChannelAccessEditor
            integration={integration}
            onUpdate={onUpdate}
            organizationId={organizationId}
          />
          <SettingRow
            description="The agent posts activity updates here, like new drafts and completed work."
            title="Notifications channel"
          >
            <SlackNotificationChannelPicker
              integration={integration}
              onUpdate={onUpdate}
              organizationId={organizationId}
            />
          </SettingRow>
        </CardContent>
      </Card>
      <DeleteIntegrationDialog
        affectedSchedules={[]}
        integrationName={integration.displayName}
        isDeleting={deleteMutation.isPending}
        isLoadingSchedules={false}
        onConfirm={() => {
          deleteMutation.mutate();
          setIsDeleteDialogOpen(false);
        }}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      />
    </>
  );
}

export default function PageClient({
  organizationSlug,
}: SlackIntegrationsPageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  useHotkey("C", () => setDialogOpen(true), { enabled: !dialogOpen });

  useSlackConnectionToast();

  const {
    data: response,
    isLoading: isLoadingIntegrations,
    refetch,
  } = useQuery(
    dashboardOrpc.integrations.slack.list.queryOptions({
      input: { organizationId: organization?.id ?? "" },
      enabled: !!organization?.id,
    })
  );

  const integrations = response?.integrations;
  const showLoading = !!organization?.id && isLoadingIntegrations && !response;

  const authorizeUrl = `/api/integrations/slack/authorize?organizationId=${organization?.id ?? ""}&callbackPath=${encodeURIComponent(pathname)}`;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description="Chat with your Notra agent in Slack and control where it responds"
          title="Slack Integration"
        >
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            Add to Slack
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>

        <div>
          {showLoading ? <SlackIntegrationsPageSkeleton /> : null}

          {!showLoading && (!integrations || integrations.length === 0) ? (
            <EmptyState
              action={
                <Button
                  onClick={() => setDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  Add to Slack
                </Button>
              }
              description="Install the Notra agent in your Slack workspace to chat and approve content from Slack threads."
              preview={
                <EmptyStateCardsPreview count={2} variant="integration" />
              }
              title="No workspace connected"
            />
          ) : null}

          {!showLoading && integrations && integrations.length > 0 ? (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <SlackIntegrationCard
                  integration={integration}
                  key={integration.id}
                  onUpdate={() => refetch()}
                  organizationId={organization?.id ?? ""}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <AddSlackIntegrationDialog
        authorizeUrl={authorizeUrl}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </PageContainer>
  );
}
