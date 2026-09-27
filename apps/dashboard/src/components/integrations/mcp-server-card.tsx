"use client";

import {
  CpuIcon,
  Delete02Icon,
  MoreHorizontalIcon,
  Refresh03Icon,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { getMcpFaviconUrl, MCP_ACCENT_COLOR } from "@/lib/integrations/mcp";
import type {
  McpServerCardProps,
  McpServerCardTranslator,
} from "@/types/integrations/mcp";

export function McpServerCard({
  server,
  onToggle,
  onDelete,
  onRefreshTools,
  onReauthorize,
  refreshing = false,
  reauthorizing = false,
}: McpServerCardProps) {
  const t = useTranslations("integrations.mcp.serverCard");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const needsReauthorization =
    server.authType === "oauth" && server.oauthStatus !== "connected";

  return (
    <>
      <TitleCard
        accentColor={MCP_ACCENT_COLOR}
        action={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge variant={server.enabled ? "default" : "secondary"}>
              {server.enabled
                ? tCommon("states.enabled")
                : tCommon("states.disabled")}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="icon-sm" variant="ghost">
                    <HugeiconsIcon
                      className="size-4"
                      icon={MoreHorizontalIcon}
                    />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onToggle?.(server.id, !server.enabled)}
                >
                  {server.enabled
                    ? tCommon("actions.disable")
                    : tCommon("actions.enable")}
                </DropdownMenuItem>
                {server.authType === "oauth" ? (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={reauthorizing}
                    onClick={() => onReauthorize?.(server.id)}
                  >
                    <HugeiconsIcon
                      className={`size-4 ${reauthorizing ? "animate-spin" : ""}`}
                      icon={Refresh03Icon}
                    />
                    {tIntegrationsShared("reauthorize")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={refreshing || !server.enabled}
                  onClick={() => onRefreshTools?.(server.id)}
                >
                  <HugeiconsIcon
                    className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                    icon={Refresh03Icon}
                  />
                  {tIntegrationsShared("refreshTools")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(event) => {
                    event.preventDefault();
                    setShowDeleteDialog(true);
                  }}
                  variant="destructive"
                >
                  <HugeiconsIcon className="size-4" icon={Delete02Icon} />
                  {tCommon("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        className="h-full"
        footer={
          needsReauthorization ? (
            <>
              <p className="text-warning text-sm">{t("accessExpired")}</p>
              <Button
                aria-label={t("reauthorizeAriaLabel", { name: server.name })}
                disabled={reauthorizing}
                onClick={() => onReauthorize?.(server.id)}
                size="sm"
                variant="outline"
              >
                {reauthorizing
                  ? tIntegrationsShared("redirecting")
                  : tIntegrationsShared("reauthorize")}
              </Button>
            </>
          ) : undefined
        }
        heading={server.name}
        icon={
          <Avatar className="size-7 rounded-md after:hidden">
            <AvatarImage
              className="rounded-md"
              src={getMcpFaviconUrl(server.url)}
            />
            <AvatarFallback className="rounded-md bg-transparent">
              <HugeiconsIcon icon={CpuIcon} />
            </AvatarFallback>
          </Avatar>
        }
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="text-xs font-normal" variant="secondary">
              Streamable HTTP
            </Badge>
            <Badge
              className="text-xs font-normal"
              variant={needsReauthorization ? "destructive" : "outline"}
            >
              {getAuthLabel(t, tIntegrationsShared, server)}
            </Badge>
            <Badge
              className="text-xs font-normal"
              variant={
                server.toolSyncStatus === "error" ? "destructive" : "secondary"
              }
            >
              {getSyncLabel(t, server.toolSyncStatus)}
            </Badge>
            <Badge className="text-xs font-normal" variant="outline">
              {t("toolCount", { count: server.indexedToolCount ?? 0 })}
            </Badge>
          </div>
          <p
            className="text-muted-foreground truncate font-mono text-xs"
            title={server.url}
          >
            {server.url}
          </p>
          {server.toolSyncError ? (
            <p
              className="text-destructive truncate text-xs"
              title={server.toolSyncError}
            >
              {server.toolSyncError}
            </p>
          ) : null}
        </div>
      </TitleCard>

      <ResponsiveAlertDialog
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              {t("deleteTitle")}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription className="wrap-anywhere">
              {t("deleteDescription", { name: server.name })}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>
              {tCommon("actions.cancel")}
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(server.id);
                setShowDeleteDialog(false);
              }}
            >
              {tCommon("actions.delete")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}

function getAuthLabel(
  t: McpServerCardTranslator,
  tShared: ReturnType<typeof useTranslations<"integrations.shared">>,
  server: McpServerCardProps["server"]
) {
  if (server.authType === "oauth") {
    return server.oauthStatus === "connected"
      ? tShared("oauth")
      : t("auth.reauthorizeNeeded");
  }
  return server.authType === "headers" ? tShared("apiKey") : t("auth.none");
}

function getSyncLabel(
  t: McpServerCardTranslator,
  status: McpServerCardProps["server"]["toolSyncStatus"]
) {
  switch (status) {
    case "syncing":
      return t("sync.syncing");
    case "synced":
      return t("sync.synced");
    case "error":
      return t("sync.error");
    default:
      return t("sync.notSynced");
  }
}
