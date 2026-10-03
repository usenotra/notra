"use client";

import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Copy01Icon,
  Delete02Icon,
  GithubIcon,
  LayoutTwoColumnIcon,
  Loading03Icon,
  MoreHorizontalIcon,
  LayoutTwoRowIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useLocale, useTranslations } from "next-intl";
import { Fragment } from "react";

import { Button } from "@/components/button";
import { SITE_EDITOR_SAVED_TICK_MS } from "@/constants/site-editor";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import type {
  SiteEditorDraftChipProps,
  SiteEditorFileBarProps,
  SiteEditorMode,
} from "@/types/site-editor";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { formatRelative } from "@/utils/format-relative";
import { siteFileGithubUrl, siteFileLiveUrl } from "@/utils/site-editor";

function SiteEditorDraftChip({
  saveState,
  savedAt,
  hasDraft,
  hasConflict,
  isNewFile,
}: SiteEditorDraftChipProps) {
  const t = useTranslations("sites.editorPage.state");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const showsTime = saveState.status === "saved" || saveState.status === "idle";
  const now = useNow(showsTime && savedAt !== null, SITE_EDITOR_SAVED_TICK_MS);

  let dot = "bg-muted-foreground/40";
  let label = t("published");
  let spinning = false;
  if (hasConflict) {
    dot = "bg-destructive";
    label = t("conflict");
  } else if (saveState.status === "error") {
    dot = "bg-destructive";
    label = t("error");
  } else if (saveState.status === "saving") {
    spinning = true;
    label = t("saving");
  } else if (saveState.status === "dirty") {
    dot = "bg-warning/50 ring-1 ring-warning";
    label = t("unsaved");
  } else if (hasDraft || isNewFile) {
    dot = isNewFile ? "bg-success" : "bg-warning";
    const kind = isNewFile ? t("newFile") : t("draft");
    label = savedAt
      ? t("savedAgo", {
          kind,
          time: formatRelative(
            savedAt.toISOString(),
            locale,
            tCommon("labels.justNow").toLocaleLowerCase(locale),
            now
          ),
        })
      : kind;
  }

  return (
    <span
      aria-live="polite"
      className={cn(
        "text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap",
        (hasConflict || saveState.status === "error") && "text-destructive"
      )}
      title={saveState.status === "error" ? saveState.error : label}
    >
      {spinning ? (
        <HugeiconsIcon
          aria-hidden="true"
          className="shrink-0 motion-safe:animate-spin"
          icon={Loading03Icon}
          size={12}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", dot)}
        />
      )}
      <span className="sr-only truncate lg:not-sr-only">{label}</span>
    </span>
  );
}

export function SiteEditorFileBar({
  site,
  path,
  document,
  saveState,
  savedAt,
  hasDraft,
  hasConflict,
  isDiscarding,
  mode,
  diffStyle,
  onModeChange,
  onDiffStyleChange,
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
  const canDiscard = hasDraft || isNewFile;
  const nextDiffStyle = diffStyle === "split" ? "unified" : "split";

  const breadcrumb = (
    <span className="flex min-w-0 items-center gap-1 truncate text-[13px]">
      {segments.slice(0, -1).map((segment, index) => (
        // Path segments are positional; the same folder name can repeat.
        <Fragment key={`${index}-${segment}`}>
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
        <SiteEditorDraftChip
          hasConflict={hasConflict}
          hasDraft={hasDraft}
          isNewFile={isNewFile}
          savedAt={savedAt}
          saveState={saveState}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {mode === "changes" ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={t(`diffStyle.${nextDiffStyle}`)}
                  className="text-muted-foreground hidden sm:inline-flex"
                  onClick={() => onDiffStyleChange(nextDiffStyle)}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon
                icon={
                  nextDiffStyle === "split"
                    ? LayoutTwoColumnIcon
                    : LayoutTwoRowIcon
                }
                size={15}
                strokeWidth={1.5}
              />
            </TooltipTrigger>
            <TooltipContent>{t(`diffStyle.${nextDiffStyle}`)}</TooltipContent>
          </Tooltip>
        ) : null}
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
