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
import { useState } from "react";

import { Button } from "@/components/button";
import { getMcpFaviconUrl, MCP_ACCENT_COLOR } from "@/lib/integrations/mcp";
import type { McpServerCardProps } from "@/types/integrations/mcp";

export function McpServerCard({
  server,
  onToggle,
  onDelete,
  onRefreshTools,
  onReauthorize,
  refreshing = false,
  reauthorizing = false,
}: McpServerCardProps) {
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
              {server.enabled ? "Enabled" : "Disabled"}
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
                  {server.enabled ? "Disable" : "Enable"}
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
                    Reauthorize
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
                  Refresh tools
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
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        className="h-full"
        footer={
          needsReauthorization ? (
            <>
              <p className="text-warning text-sm">
                Access expired. Reauthorize to keep tools working.
              </p>
              <Button
                aria-label={`Reauthorize ${server.name}`}
                disabled={reauthorizing}
                onClick={() => onReauthorize?.(server.id)}
                size="sm"
                variant="outline"
              >
                {reauthorizing ? "Redirecting..." : "Reauthorize"}
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
              {getAuthLabel(server)}
            </Badge>
            <Badge
              className="text-xs font-normal"
              variant={
                server.toolSyncStatus === "error" ? "destructive" : "secondary"
              }
            >
              {getSyncLabel(server.toolSyncStatus)}
            </Badge>
            <Badge className="text-xs font-normal" variant="outline">
              {server.indexedToolCount ?? 0} tools
            </Badge>
          </div>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {server.url}
          </p>
          {server.toolSyncError ? (
            <p className="text-destructive truncate text-xs">
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
              Delete MCP server?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This will permanently remove &quot;{server.name}&quot; from this
              organization.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(server.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}

function getAuthLabel(server: McpServerCardProps["server"]) {
  if (server.authType === "oauth") {
    return server.oauthStatus === "connected" ? "OAuth" : "Reauthorize needed";
  }
  return server.authType === "headers" ? "API key" : "No auth";
}

function getSyncLabel(status: McpServerCardProps["server"]["toolSyncStatus"]) {
  switch (status) {
    case "syncing":
      return "Syncing";
    case "synced":
      return "Synced";
    case "error":
      return "Sync error";
    default:
      return "Not synced";
  }
}
