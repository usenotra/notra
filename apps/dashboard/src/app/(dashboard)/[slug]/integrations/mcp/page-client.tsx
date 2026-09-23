"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { openMcpOAuthPopup } from "@notra/utils/oauth-popup";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { AddMcpServerDialog } from "@/components/integrations/add-mcp-server-dialog";
import { McpServerCard } from "@/components/integrations/mcp-server-card";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { dashboardOrpc } from "@/lib/orpc/query";

import { IntegrationsPageSkeleton } from "../skeleton";

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id ?? "";
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reauthorizingServerId, setReauthorizingServerId] = useState<
    string | null
  >(null);
  useHotkey("C", () => setDialogOpen(true), { enabled: !dialogOpen });

  const queryInput = { organizationId };

  const { data, isLoading } = useQuery(
    dashboardOrpc.integrations.mcp.list.queryOptions({
      input: queryInput,
      enabled: Boolean(organizationId),
    })
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.mcp.list.queryKey({
        input: queryInput,
      }),
    });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) =>
      dashboardOrpc.integrations.mcp.update.call({
        organizationId,
        serverId: id,
        enabled,
      }),
    onSuccess: (_, variables) => {
      invalidate();
      toast.success(
        variables.enabled ? "MCP server enabled" : "MCP server disabled"
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      dashboardOrpc.integrations.mcp.delete.call({
        organizationId,
        serverId: id,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("MCP server deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: string) =>
      dashboardOrpc.integrations.mcp.refreshTools.call({
        organizationId,
        serverId: id,
      }),
    onSuccess: (result) => {
      invalidate();
      toast.success(`Indexed ${result.indexedToolCount} MCP tools`);
    },
    onError: (error) => {
      invalidate();
      toast.error(error.message);
    },
  });

  async function reauthorize(id: string) {
    const oauthPopup = openMcpOAuthPopup();
    setReauthorizingServerId(id);
    try {
      const { authorizationUrl } =
        await dashboardOrpc.integrations.mcp.reauthorizeOAuth.call({
          organizationId,
          serverId: id,
          callbackPath: window.location.pathname,
        });
      setReauthorizingServerId((current) => (current === id ? null : current));
      oauthPopup.navigate(authorizationUrl);
    } catch (error) {
      oauthPopup.close();
      setReauthorizingServerId((current) => (current === id ? null : current));
      toast.error(
        error instanceof Error ? error.message : "Could not restart OAuth"
      );
    }
  }

  const servers = data?.servers ?? [];
  const showLoading = Boolean(organizationId) && isLoading && !data;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description="Connect custom Model Context Protocol servers to bring your own tools and context into Notra"
          title="MCP Servers"
        >
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            Connect MCP Server
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>

        <div>
          {showLoading ? <IntegrationsPageSkeleton /> : null}

          {!showLoading && servers.length === 0 ? (
            <EmptyState
              action={
                <Button
                  onClick={() => setDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  Connect MCP Server
                </Button>
              }
              description="Connect a custom MCP server to extend Notra with tools and data from your own systems."
              preview={
                <EmptyStateCardsPreview
                  columns={3}
                  count={3}
                  variant="integration"
                />
              }
              title="No custom servers yet"
            />
          ) : null}

          {!showLoading && servers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {servers.map((server) => (
                <McpServerCard
                  key={server.id}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onReauthorize={reauthorize}
                  onRefreshTools={(id) => refreshMutation.mutate(id)}
                  onToggle={(id, enabled) =>
                    toggleMutation.mutate({ id, enabled })
                  }
                  reauthorizing={reauthorizingServerId === server.id}
                  refreshing={
                    refreshMutation.isPending &&
                    refreshMutation.variables === server.id
                  }
                  server={server}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <AddMcpServerDialog
        onOpenChange={setDialogOpen}
        onSuccess={invalidate}
        open={dialogOpen}
        organizationId={organizationId}
      />
    </PageContainer>
  );
}
