"use client";

import {
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
  Refresh03Icon,
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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("integrations.store.manage");
  const tIntegrationsShared = useTranslations("integrations.shared");
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
      toast.success(t("updated"));
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
      toast.success(t("indexed", { count: result.indexedToolCount }));
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
        error instanceof Error
          ? error.message
          : tIntegrationsShared("couldNotRestartOauth")
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
      toast.success(t("disconnected"));
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCredentials = () => {
    const headers: Record<string, string> = {};
    for (const row of headerRows) {
      const name = row.name.trim();
      const value = row.value.trim();
      if (!(name && value)) {
        toast.error(t("headerIncomplete"));
        return;
      }
      headers[name] = value;
    }
    if (Object.keys(headers).length === 0) {
      toast.error(tIntegrationsShared("addAtLeastOneAuthentication"));
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
                  {t("description")}
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
  const t = useTranslations("integrations.store.manage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon4 = useTranslations("common");
  const authLabels = {
    oauth: tIntegrationsShared("oauth"),
    apiKey: tCommon4("labels.apiKey"),
    none: t("auth.none"),
  };
  const tCommon = useTranslations("common");

  return (
    <div className="divide-y rounded-lg border">
      <ConnectionDetail label={tCommon("labels.status")}>
        <Badge variant={connection.enabled ? "default" : "secondary"}>
          {connection.enabled
            ? tCommon("states.enabled")
            : tCommon("states.disabled")}
        </Badge>
      </ConnectionDetail>
      <ConnectionDetail label={tIntegrationsShared("authentication")}>
        {authLabels[getAuthenticationLabelKey(connection.authType)]}
      </ConnectionDetail>
      <ConnectionDetail label={t("tools")}>
        {connection.indexedToolCount ?? 0}
      </ConnectionDetail>
      <ConnectionDetail label={t("endpoint")}>
        <span
          className="block max-w-64 truncate font-mono text-xs"
          title={connection.url}
        >
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
  const t = useTranslations("integrations.store.manage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon2 = useTranslations("common");

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">{t("credentialsTitle")}</h3>
        <p className="text-muted-foreground text-xs">
          {t("credentialsDescription")}
        </p>
      </div>
      {headerRows.map((row, index) => (
        <div className="flex items-end gap-2" key={row.id}>
          <Field className="flex-1">
            <FieldLabel htmlFor={`store-header-name-${row.id}`}>
              {t("header")}
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
              {t("newValue")}
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
            aria-label={tIntegrationsShared("removeAuthenticationHeader")}
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
          {t("addHeader")}
        </Button>
        <Button disabled={updating} onClick={onUpdate} size="sm" type="button">
          {updating ? tCommon2("labels.updating") : t("updateCredentials")}
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
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");

  return (
    <ResponsiveDialogFooter className="flex-wrap sm:justify-between">
      <Button onClick={onDisconnect} type="button" variant="destructive">
        <HugeiconsIcon icon={Delete02Icon} />
        {tCommon("actions.disconnect")}
      </Button>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={!connection.enabled}
          loading={refreshing}
          onClick={onRefresh}
          type="button"
          variant="outline"
        >
          <HugeiconsIcon icon={Refresh03Icon} />
          {tIntegrationsShared("refreshTools")}
        </Button>
        {connection.authType === "oauth" ? (
          <Button
            disabled={reauthorizing}
            onClick={onReauthorize}
            type="button"
            variant="outline"
          >
            {tIntegrationsShared("reauthorize")}
          </Button>
        ) : null}
        <Button
          disabled={updating}
          onClick={onToggle}
          type="button"
          variant="outline"
        >
          {connection.enabled
            ? tCommon("actions.disable")
            : tCommon("actions.enable")}
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
  const t = useTranslations("integrations.store.manage");
  const tCommon = useTranslations("common");

  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {t("disconnectTitle", { name: integrationName })}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {t("disconnectDescription")}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel>
            {tCommon("actions.cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={disconnecting}
            onClick={onDisconnect}
          >
            {disconnecting ? t("disconnecting") : tCommon("actions.disconnect")}
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
  const tCommon3 = useTranslations("common");
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
        alt={tCommon3("labels.nameLogo", { name: integration.name })}
        className="size-9 object-contain dark:hidden"
        height={36}
        src={lightLogo}
        width={36}
      />
      <Image
        alt={tCommon3("labels.nameLogo", { name: integration.name })}
        className="hidden size-9 object-contain dark:block"
        height={36}
        src={darkLogo}
        width={36}
      />
    </div>
  );
}

function getAuthenticationLabelKey(authType: string) {
  if (authType === "oauth") {
    return "oauth";
  }
  if (authType === "headers") {
    return "apiKey";
  }
  return "none";
}
