"use client";

import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Copy01Icon,
  Delete02Icon,
  GithubIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { Fragment } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type {
  SiteEditorFileBarProps,
  SiteEditorSaveErrorProps,
} from "@/types/components/site-editor";
import type { SiteEditorMode } from "@/types/site-editor";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { siteFileGithubUrl, siteFileLiveUrl } from "@/utils/site-editor";

function SiteEditorSaveError({ error }: SiteEditorSaveErrorProps) {
  const t = useTranslations("sites.editorPage.state");
  return (
    <span
      className="text-destructive inline-flex min-w-0 shrink-0 items-center gap-1 text-xs whitespace-nowrap"
      role="alert"
      title={error}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="shrink-0"
        icon={Alert02Icon}
        size={13}
        strokeWidth={1.5}
      />
      <span className="sr-only sm:not-sr-only">{t("error")}</span>
    </span>
  );
}

export function SiteEditorFileBar({
  site,
  path,
  document,
  saveState,
  hasDraft,
  isDiscarding,
  mode,
  onModeChange,
  onDiscard,
  onOpenFilePicker,
}: SiteEditorFileBarProps) {
  const t = useTranslations("sites.editorPage.file");
  const segments = path.split("/");
  const fileName = segments.at(-1) ?? path;
  const isNewFile = document !== null && document.published === null;
  const liveUrl =
    !isNewFile && site.liveDeploymentId
      ? siteFileLiveUrl(path, site.publicOrigin, site.mounts)
      : null;
  const githubUrl = isNewFile ? null : siteFileGithubUrl(site, path);
  const canDiscard = hasDraft;

  const breadcrumb = (
    <span className="flex min-w-0 items-center gap-1 truncate text-[13px]">
      {segments.slice(0, -1).map((segment, index) => (
        <Fragment key={segments.slice(0, index + 1).join("/")}>
          <span className="text-muted-foreground hidden sm:inline">
            {segment}
          </span>
          <span
            aria-hidden="true"
            className="text-muted-foreground/50 hidden sm:inline"
          >
            /
          </span>
        </Fragment>
      ))}
      <span className="text-foreground truncate font-medium">{fileName}</span>
    </span>
  );

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b ps-3.5 pe-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {onOpenFilePicker ? (
          <button
            aria-haspopup="dialog"
            className="hover:bg-muted -ms-1.5 flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 transition-colors duration-150 md:hidden"
            onClick={onOpenFilePicker}
            title={path}
            type="button"
          >
            {breadcrumb}
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground shrink-0"
              icon={ArrowDown01Icon}
              size={13}
            />
          </button>
        ) : null}
        <div
          className={cn(
            "min-w-0 items-center",
            onOpenFilePicker ? "hidden md:flex" : "flex"
          )}
          title={path}
        >
          {breadcrumb}
        </div>
        {saveState.status === "error" ? (
          <SiteEditorSaveError error={saveState.error} />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tabs
          onValueChange={(value) => onModeChange(value as SiteEditorMode)}
          value={mode}
        >
          <TabsList aria-label={t("view")} className="h-7!">
            <TabsTrigger className="px-2 text-xs" value="edit">
              {t("edit")}
            </TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="changes">
              {t("changes")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={t("more")}
                className="text-muted-foreground"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => {
                void copyTextToClipboard(path, t("pathCopied"));
              }}
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={1.75} />
              {t("copyPath")}
            </DropdownMenuItem>
            {githubUrl ? (
              <DropdownMenuItem
                onClick={() =>
                  window.open(githubUrl, "_blank", "noopener,noreferrer")
                }
              >
                <HugeiconsIcon icon={GithubIcon} size={14} strokeWidth={1.75} />
                {t("openOnGithub")}
              </DropdownMenuItem>
            ) : null}
            {liveUrl ? (
              <DropdownMenuItem
                onClick={() =>
                  window.open(liveUrl, "_blank", "noopener,noreferrer")
                }
              >
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  size={14}
                  strokeWidth={1.75}
                />
                {t("viewOnSite")}
              </DropdownMenuItem>
            ) : null}
            {canDiscard ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isDiscarding}
                  onClick={onDiscard}
                  variant="destructive"
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={14}
                    strokeWidth={1.75}
                  />
                  {isNewFile ? t("discardNew") : t("discard")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
