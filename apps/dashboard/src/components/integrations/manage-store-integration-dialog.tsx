"use client";

import {
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_MCP_HEADERS } from "@notra/schemas/dashboard/integrations";
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
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { openMcpOAuthPopup } from "@notra/utils/oauth-popup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCcwIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  ManageStoreIntegrationDialogProps,
  McpConnectionActionsProps,
  McpConnectionDetailProps,
  McpConnectionSummaryProps,
  McpCredentialEditorProps,
  McpCredentialHeaderRow,
  McpDisconnectDialogProps,
  McpStoreConnectionUpdate,
  StoreIntegrationDialogLogoProps,
} from "@/types/integrations/mcp";

export function ManageStoreIntegrationDialog({
  integration,
  onDisconnected,
  onOpenChange,
  open,
  organizationId,
}: ManageStoreIntegrationDialogProps) {
  const connection = integration.connection;
  const queryClient = useQueryClient();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [reauthorizing, setReauthorizing] = useState(false);
  const [headerRows, setHeaderRows] = useState<McpCredentialHeaderRow[]>(() => {
    const names =
      connection.headerNames && connection.headerNames.length > 0
        ? connection.headerNames
        : ["Authorization"];
    return names.map((name, index) => ({
      id: `stored-header-${index}`,
      name,
      value: "",
    }));
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.mcp.list.queryKey({
        input: { organizationId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.mcp.storeList.queryKey({
        input: { organizationId },
      }),
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: McpStoreConnectionUpdate) =>
      dashboardOrpc.integrations.mcp.update.call({
        organizationId,
        serverId: connection.id,
        ...updates,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Integration updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const refreshMutation = useMutation({
    mutationFn: async () =>
      dashboardOrpc.integrations.mcp.refreshTools.call({
        organizationId,
        serverId: connection.id,
      }),
    onSuccess: (result) => {
      invalidate();
      toast.success(`Indexed ${result.indexedToolCount} tools`);
    },
    onError: (error) => toast.error(error.message),
  });

  async function reauthorize() {
    const oauthPopup = openMcpOAuthPopup();
    setReauthorizing(true);
    try {
      const { authorizationUrl } =
        await dashboardOrpc.integrations.mcp.reauthorizeOAuth.call({
          organizationId,
          serverId: connection.id,
          callbackPath: window.location.pathname,
        });
      setReauthorizing(false);
      oauthPopup.navigate(authorizationUrl);
    } catch (error) {
      oauthPopup.close();
      setReauthorizing(false);
      toast.error(
        error instanceof Error ? error.message : "Could not restart OAuth"
      );
    }
  }

  const disconnectMutation = useMutation({
    mutationFn: async () =>
      dashboardOrpc.integrations.mcp.delete.call({
        organizationId,
        serverId: connection.id,
      }),
    onSuccess: () => {
      invalidate();
      setShowDisconnectDialog(false);
      onOpenChange(false);
      onDisconnected();
      toast.success("Integration disconnected");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCredentials = () => {
    const headers: Record<string, string> = {};
    for (const row of headerRows) {
      const name = row.name.trim();
      const value = row.value.trim();
      if (!(name && value)) {
        toast.error("Enter a name and value for every header");
        return;
      }
      headers[name] = value;
    }
    if (Object.keys(headers).length === 0) {
      toast.error("Add at least one authentication header");
      return;
    }
    updateMutation.mutate({ authType: "headers", headers });
  };

  return (
    <>
      <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
        <ResponsiveDialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-[32.5rem]">
          <ResponsiveDialogHeader>
            <div className="flex items-start gap-3">
              <StoreIntegrationDialogLogo integration={integration} />
              <div>
                <ResponsiveDialogTitle>
                  {integration.name}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Manage this integration's connection and credentials.
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <ConnectionSummary connection={connection} />

            {connection.authType === "headers" ? (
              <CredentialEditor
                headerRows={headerRows}
                onUpdate={updateCredentials}
                setHeaderRows={setHeaderRows}
                updating={updateMutation.isPending}
              />
            ) : null}
          </div>

          <ConnectionActions
            connection={connection}
            onDisconnect={() => setShowDisconnectDialog(true)}
            onReauthorize={reauthorize}
            onRefresh={() => refreshMutation.mutate()}
            onToggle={() =>
              updateMutation.mutate({ enabled: !connection.enabled })
            }
            reauthorizing={reauthorizing}
            refreshing={refreshMutation.isPending}
            updating={updateMutation.isPending}
          />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <DisconnectDialog
        disconnecting={disconnectMutation.isPending}
        integrationName={integration.name}
        onDisconnect={() => disconnectMutation.mutate()}
        onOpenChange={setShowDisconnectDialog}
        open={showDisconnectDialog}
      />
    </>
  );
}

function ConnectionSummary({ connection }: McpConnectionSummaryProps) {
  return (
    <div className="divide-y rounded-lg border">
      <ConnectionDetail label="Status">
        <Badge variant={connection.enabled ? "default" : "secondary"}>
          {connection.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </ConnectionDetail>
      <ConnectionDetail label="Authentication">
        {getAuthenticationLabel(connection.authType)}
      </ConnectionDetail>
      <ConnectionDetail label="Tools">
        {connection.indexedToolCount ?? 0}
      </ConnectionDetail>
      <ConnectionDetail label="Endpoint">
        <span className="max-w-64 truncate font-mono text-xs">
          {connection.url}
        </span>
      </ConnectionDetail>
    </div>
  );
}

function CredentialEditor({
  headerRows,
  onUpdate,
  setHeaderRows,
  updating,
}: McpCredentialEditorProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">API credentials</h3>
        <p className="text-muted-foreground text-xs">
          Stored values stay hidden. Enter replacements to update them.
        </p>
      </div>
      {headerRows.map((row, index) => (
        <div className="flex items-end gap-2" key={row.id}>
          <Field className="flex-1">
            <FieldLabel htmlFor={`store-header-name-${row.id}`}>
              Header
            </FieldLabel>
            <Input
              id={`store-header-name-${row.id}`}
              onChange={(event) =>
                setHeaderRows((rows) =>
                  rows.map((candidate, rowIndex) =>
                    rowIndex === index
                      ? { ...candidate, name: event.target.value }
                      : candidate
                  )
                )
              }
              value={row.name}
            />
          </Field>
          <Field className="flex-[1.3]">
            <FieldLabel htmlFor={`store-header-value-${row.id}`}>
              New value
            </FieldLabel>
            <Input
              autoComplete="off"
              id={`store-header-value-${row.id}`}
              onChange={(event) =>
                setHeaderRows((rows) =>
                  rows.map((candidate, rowIndex) =>
                    rowIndex === index
                      ? { ...candidate, value: event.target.value }
                      : candidate
                  )
                )
              }
              type="password"
              value={row.value}
            />
          </Field>
          <Button
            aria-label="Remove authentication header"
            onClick={() =>
              setHeaderRows((rows) =>
                rows.filter((candidate) => candidate.id !== row.id)
              )
            }
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={MinusSignIcon} />
          </Button>
        </div>
      ))}
      <div className="flex justify-between gap-2">
        <Button
          disabled={headerRows.length >= MAX_MCP_HEADERS}
          onClick={() =>
            setHeaderRows((rows) => [
              ...rows,
              { id: crypto.randomUUID(), name: "", value: "" },
            ])
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon icon={PlusSignIcon} />
          Add header
        </Button>
        <Button disabled={updating} onClick={onUpdate} size="sm" type="button">
          {updating ? "Updating..." : "Update credentials"}
        </Button>
      </div>
    </div>
  );
}

function ConnectionActions({
  connection,
  onDisconnect,
  onReauthorize,
  onRefresh,
  onToggle,
  reauthorizing,
  refreshing,
  updating,
}: McpConnectionActionsProps) {
  return (
    <ResponsiveDialogFooter className="flex-wrap sm:justify-between">
      <Button onClick={onDisconnect} type="button" variant="destructive">
        <HugeiconsIcon icon={Delete02Icon} />
        Disconnect
      </Button>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={refreshing || !connection.enabled}
          onClick={onRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCcwIcon className={refreshing ? "animate-spin" : ""} />
          Refresh tools
        </Button>
        {connection.authType === "oauth" ? (
          <Button
            disabled={reauthorizing}
            onClick={onReauthorize}
            type="button"
            variant="outline"
          >
            Reauthorize
          </Button>
        ) : null}
        <Button
          disabled={updating}
          onClick={onToggle}
          type="button"
          variant="outline"
        >
          {connection.enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </ResponsiveDialogFooter>
  );
}

function DisconnectDialog({
  disconnecting,
  integrationName,
  onDisconnect,
  onOpenChange,
  open,
}: McpDisconnectDialogProps) {
  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            Disconnect {integrationName}?
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            Its tools will no longer be available to this organization. You can
            reconnect it later.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={disconnecting}
            onClick={onDisconnect}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

function ConnectionDetail({ children, label }: McpConnectionDetailProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground min-w-0">{children}</span>
    </div>
  );
}

function StoreIntegrationDialogLogo({
  integration,
}: StoreIntegrationDialogLogoProps) {
  const lightLogo = integration.logoLightUrl ?? integration.logoDarkUrl;
  const darkLogo = integration.logoDarkUrl ?? integration.logoLightUrl;

  if (!(lightLogo && darkLogo)) {
    return (
      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium">
        {integration.name.trim().slice(0, 2).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    <div className="bg-muted size-9 shrink-0 overflow-hidden rounded-lg">
      <Image
        alt={`${integration.name} logo`}
        className="size-9 object-contain dark:hidden"
        height={36}
        src={lightLogo}
        width={36}
      />
      <Image
        alt={`${integration.name} logo`}
        className="hidden size-9 object-contain dark:block"
        height={36}
        src={darkLogo}
        width={36}
      />
    </div>
  );
}

function getAuthenticationLabel(authType: string) {
  if (authType === "oauth") {
    return "OAuth";
  }
  if (authType === "headers") {
    return "API key";
  }
  return "No authentication";
}
