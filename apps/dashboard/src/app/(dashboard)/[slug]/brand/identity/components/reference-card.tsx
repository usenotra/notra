"use client";

import {
  Comment01Icon,
  Delete02Icon,
  Edit02Icon,
  FavouriteIcon,
  Link04Icon,
  MoreHorizontalIcon,
  RepeatIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  getFaviconUrl,
  getMetadataString,
  getReferenceDomain,
  getTwitterAvatarUrl,
  getTwitterHandleFromUrl,
} from "@notra/geo-core/utils/reference-display";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Label } from "@notra/ui/components/ui/label";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import type {
  ReferenceCardProps,
  TweetMetadata,
} from "@/types/hooks/brand-references";
import type { CommonTranslator } from "@/types/i18n";
import { formatTweetContent } from "@/utils/format-tweet-content";
import { getSafeReferenceSourceUrl } from "@/utils/reference-source-url";

const PLATFORM_OPTIONS = ["all", "twitter", "linkedin", "blog"] as const;

function formatCompactNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

function formatRelativeDate(
  dateStr: string,
  t: ReturnType<typeof useTranslations<"brand.references.card">>,
  tCommon: CommonTranslator,
  locale: string
): string | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return tCommon("labels.today");
  }
  if (diffDays === 1) {
    return tCommon("labels.yesterday");
  }
  if (diffDays < 7) {
    return t("daysAgo", { count: diffDays });
  }
  if (diffDays < 30) {
    return t("weeksAgo", { count: Math.floor(diffDays / 7) });
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function SourceLink({ sourceUrl }: { sourceUrl: string | null | undefined }) {
  const t = useTranslations("brand.references.card");
  if (!sourceUrl) {
    return null;
  }
  const safeSourceUrl = getSafeReferenceSourceUrl(sourceUrl);
  if (!safeSourceUrl) {
    return null;
  }

  return (
    <a
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs transition-colors"
      href={safeSourceUrl}
      rel="noreferrer"
      target="_blank"
    >
      <HugeiconsIcon className="size-3.5" icon={Link04Icon} />
      {t("openSource")}
    </a>
  );
}

export function ReferenceCard({
  reference,
  onDelete,
  onUpdateNote,
  onUpdateApplicableTo,
  isDeleting,
}: ReferenceCardProps) {
  if (reference.type === "custom") {
    return (
      <CustomReferenceCard
        isDeleting={isDeleting}
        onDelete={onDelete}
        onUpdateApplicableTo={onUpdateApplicableTo}
        onUpdateNote={onUpdateNote}
        reference={reference}
      />
    );
  }

  if (reference.type === "blog_post") {
    return (
      <BlogReferenceCard
        isDeleting={isDeleting}
        onDelete={onDelete}
        onUpdateApplicableTo={onUpdateApplicableTo}
        onUpdateNote={onUpdateNote}
        reference={reference}
      />
    );
  }

  return (
    <TwitterReferenceCard
      isDeleting={isDeleting}
      onDelete={onDelete}
      onUpdateApplicableTo={onUpdateApplicableTo}
      onUpdateNote={onUpdateNote}
      reference={reference}
    />
  );
}

function NoteInput({
  referenceId,
  initialNote,
  onUpdateNote,
}: {
  referenceId: string;
  initialNote: string | null;
  onUpdateNote: (id: string, note: string | null) => void;
}) {
  const t = useTranslations("brand.references.card");
  const [noteValue, setNoteValue] = useState(initialNote ?? "");

  const handleNoteBlur = () => {
    const trimmed = noteValue.trim();
    if (trimmed !== (initialNote ?? "")) {
      onUpdateNote(referenceId, trimmed || null);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  return (
    <textarea
      aria-label={t("noteLabel")}
      className="placeholder:text-muted-foreground/60 focus-visible:outline-ring field-sizing-content min-h-7 w-full min-w-0 resize-y rounded-sm border-none bg-transparent px-1 py-1 text-xs shadow-none focus-visible:outline-2"
      onBlur={handleNoteBlur}
      onChange={(e) => setNoteValue(e.target.value)}
      onKeyDown={handleNoteKeyDown}
      placeholder={t("notePlaceholder")}
      rows={1}
      value={noteValue}
    />
  );
}

function PlatformBadges({ applicableTo }: { applicableTo: string[] }) {
  const t = useTranslations("brand.references.card");
  const tCommon2 = useTranslations("common");
  const getLabel = (platform: string) => {
    switch (platform) {
      case "all":
        return tCommon2("labels.all");
      case "twitter":
        return t("platformBadges.twitter");
      case "linkedin":
        return tCommon2("labels.linkedin");
      case "blog":
        return tCommon2("labels.blog");
      default:
        return platform;
    }
  };
  return (
    <div className="flex flex-wrap gap-1">
      {applicableTo.map((platform) => (
        <Badge key={platform} size="sm" variant="secondary">
          {getLabel(platform)}
        </Badge>
      ))}
    </div>
  );
}

function EditPlatformsDialog({
  open,
  onOpenChange,
  applicableTo,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicableTo: string[];
  onSave: (platforms: string[]) => void;
}) {
  const t = useTranslations("brand.references.card");
  const tCommon = useTranslations("common.actions");
  const tCommon2 = useTranslations("common");
  const [selected, setSelected] = useState<string[]>(applicableTo);

  const togglePlatform = (value: string) => {
    if (value === "all") {
      setSelected(["all"]);
      return;
    }
    const withoutAll = selected.filter((v) => v !== "all");
    const updated = withoutAll.includes(value)
      ? withoutAll.filter((v) => v !== value)
      : [...withoutAll, value];
    setSelected(updated.length === 0 ? ["all"] : updated);
  };

  const handleSave = () => {
    onSave(selected);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("editPlatformsTitle")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("editPlatformsDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-3 py-4">
          <Label>{t("useFor")}</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((option) => (
              <Button
                aria-pressed={selected.includes(option)}
                key={option}
                onClick={() => togglePlatform(option)}
                size="sm"
                type="button"
                variant={selected.includes(option) ? "secondary" : "outline"}
              >
                {option === "linkedin"
                  ? tCommon2("labels.linkedin")
                  : t(`platformOptions.${option}`)}
              </Button>
            ))}
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave}>{tCommon("save")}</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function CardMenu({
  referenceId,
  applicableTo,
  onDelete,
  onUpdateApplicableTo,
  isDeleting,
}: {
  referenceId: string;
  applicableTo: string[];
  onDelete: () => void;
  onUpdateApplicableTo: (id: string, applicableTo: string[]) => void;
  isDeleting: boolean;
}) {
  const t = useTranslations("brand.references.card");
  const tCommon2 = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button aria-label={t("actions")} size="icon-sm" variant="ghost" />
          }
        >
          <HugeiconsIcon className="size-4" icon={MoreHorizontalIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <HugeiconsIcon className="size-4" icon={Edit02Icon} />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isDeleting}
            onClick={onDelete}
            variant="destructive"
          >
            <HugeiconsIcon className="size-4" icon={Delete02Icon} />
            {isDeleting ? tCommon2("labels.deleting") : t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPlatformsDialog
        applicableTo={applicableTo}
        onOpenChange={setEditOpen}
        onSave={(platforms) => onUpdateApplicableTo(referenceId, platforms)}
        open={editOpen}
      />
    </>
  );
}

function TwitterReferenceStats({
  reference,
}: Pick<ReferenceCardProps, "reference">) {
  const locale = useLocale();
  const metadata = reference.metadata as TweetMetadata | null;
  const stats = [
    { label: "replies", icon: Comment01Icon, count: metadata?.replies ?? 0 },
    { label: "retweets", icon: RepeatIcon, count: metadata?.retweets ?? 0 },
    { label: "likes", icon: FavouriteIcon, count: metadata?.likes ?? 0 },
  ].filter((stat) => stat.count > 0);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 pt-0.5">
      {stats.map((stat) => (
        <span
          className="text-muted-foreground flex items-center gap-1 text-xs"
          key={stat.label}
        >
          <HugeiconsIcon className="size-3.5" icon={stat.icon} />
          {formatCompactNumber(stat.count, locale)}
        </span>
      ))}
    </div>
  );
}

function TwitterReferenceCard({
  reference,
  onDelete,
  onUpdateNote,
  onUpdateApplicableTo,
  isDeleting,
}: ReferenceCardProps) {
  const t = useTranslations("brand.references.card");
  const tCommon2 = useTranslations("common");
  const locale = useLocale();
  const metadata = reference.metadata as TweetMetadata | null;
  const handle =
    metadata?.authorHandle ??
    getTwitterHandleFromUrl(reference.sourceUrl ?? metadata?.url);
  const avatarSrc =
    metadata?.profileImageUrl ?? (handle ? getTwitterAvatarUrl(handle) : null);
  const displayName =
    metadata?.authorName ??
    (handle ? `@${handle}` : tCommon2("states.unknown"));
  const showHandle = Boolean(handle && metadata?.authorName);
  const createdAtLabel = metadata?.createdAt
    ? formatRelativeDate(metadata.createdAt, t, tCommon2, locale)
    : null;

  return (
    <div className="group border-border/80 border-b-border/40 bg-muted/80 hover:border-border flex h-full flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs transition-colors">
      <div className="border-border/60 bg-background flex flex-1 flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              className="size-8 rounded-full after:rounded-full"
              size="sm"
            >
              {avatarSrc && <AvatarImage src={avatarSrc} />}
              <AvatarFallback>
                {(handle ?? "??").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm leading-snug font-medium">
                  {displayName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {showHandle && (
                  <span className="text-muted-foreground truncate text-xs">
                    @{handle}
                  </span>
                )}
                {createdAtLabel && (
                  <>
                    {showHandle && (
                      <span className="text-muted-foreground/50 text-xs">
                        ·
                      </span>
                    )}
                    <span
                      className="text-muted-foreground/70 shrink-0 text-xs"
                      suppressHydrationWarning
                    >
                      {createdAtLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CardMenu
              applicableTo={reference.applicableTo}
              isDeleting={isDeleting}
              onDelete={() => onDelete(reference.id)}
              onUpdateApplicableTo={onUpdateApplicableTo}
              referenceId={reference.id}
            />
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-5 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
          {formatTweetContent(reference.content)}
        </p>

        <SourceLink sourceUrl={reference.sourceUrl ?? metadata?.url} />

        <TwitterReferenceStats reference={reference} />
      </div>

      <div className="flex items-center gap-2 px-1 pb-0.5">
        <PlatformBadges applicableTo={reference.applicableTo} />
        <div className="min-w-0 flex-1">
          <NoteInput
            initialNote={reference.note}
            onUpdateNote={onUpdateNote}
            referenceId={reference.id}
          />
        </div>
      </div>
    </div>
  );
}

function BlogReferenceCard({
  reference,
  onDelete,
  onUpdateNote,
  onUpdateApplicableTo,
  isDeleting,
}: ReferenceCardProps) {
  const t = useTranslations("brand.references.card");
  const tCommon2 = useTranslations("common");
  const locale = useLocale();
  const sourceUrl =
    reference.sourceUrl ?? getMetadataString(reference.metadata, "url");
  const domain = getReferenceDomain(sourceUrl);
  const title = getMetadataString(reference.metadata, "title");
  const authorName = getMetadataString(reference.metadata, "authorName");
  const publishedAt = getMetadataString(reference.metadata, "createdAt");
  const publishedAtLabel = publishedAt
    ? formatRelativeDate(publishedAt, t, tCommon2, locale)
    : null;
  const showDomainLine = Boolean(domain && title);

  return (
    <div className="group border-border/80 border-b-border/40 bg-muted/80 hover:border-border flex h-full flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs transition-colors">
      <div className="border-border/60 bg-background flex flex-1 flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              className="bg-muted size-8 rounded-full after:rounded-full"
              size="sm"
            >
              {domain && (
                <AvatarImage className="p-2" src={getFaviconUrl(domain)} />
              )}
              <AvatarFallback>
                {(domain ?? "??").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="block truncate text-sm leading-snug font-medium">
                {title ?? domain ?? tCommon2("labels.blogPost")}
              </span>
              <div className="flex items-center gap-1">
                {authorName && (
                  <span className="text-muted-foreground truncate text-xs">
                    {authorName}
                  </span>
                )}
                {showDomainLine && (
                  <>
                    {authorName && (
                      <span className="text-muted-foreground/50 text-xs">
                        ·
                      </span>
                    )}
                    <span className="text-muted-foreground truncate text-xs">
                      {domain}
                    </span>
                  </>
                )}
                {publishedAtLabel && (
                  <>
                    {(authorName || showDomainLine) && (
                      <span className="text-muted-foreground/50 text-xs">
                        ·
                      </span>
                    )}
                    <span
                      className="text-muted-foreground/70 shrink-0 text-xs"
                      suppressHydrationWarning
                    >
                      {publishedAtLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CardMenu
              applicableTo={reference.applicableTo}
              isDeleting={isDeleting}
              onDelete={() => onDelete(reference.id)}
              onUpdateApplicableTo={onUpdateApplicableTo}
              referenceId={reference.id}
            />
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-5 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
          {reference.content}
        </p>

        <SourceLink sourceUrl={sourceUrl} />
      </div>

      <div className="flex items-center gap-2 px-1 pb-0.5">
        <PlatformBadges applicableTo={reference.applicableTo} />
        <div className="min-w-0 flex-1">
          <NoteInput
            initialNote={reference.note}
            onUpdateNote={onUpdateNote}
            referenceId={reference.id}
          />
        </div>
      </div>
    </div>
  );
}

function CustomReferenceCard({
  reference,
  onDelete,
  onUpdateNote,
  onUpdateApplicableTo,
  isDeleting,
}: ReferenceCardProps) {
  const t = useTranslations("brand.references.card");
  const tCommon2 = useTranslations("common");
  const locale = useLocale();
  return (
    <div className="group border-border/80 border-b-border/40 bg-muted/80 hover:border-border flex h-full flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs transition-colors">
      <div className="border-border/60 bg-background flex flex-1 flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <HugeiconsIcon
                className="text-muted-foreground size-4"
                icon={TextIcon}
              />
            </div>
            <div>
              <span className="text-sm leading-snug font-medium">
                {t("customReference")}
              </span>
              <p
                className="text-muted-foreground/70 text-xs"
                suppressHydrationWarning
              >
                {formatRelativeDate(reference.createdAt, t, tCommon2, locale)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CardMenu
              applicableTo={reference.applicableTo}
              isDeleting={isDeleting}
              onDelete={() => onDelete(reference.id)}
              onUpdateApplicableTo={onUpdateApplicableTo}
              referenceId={reference.id}
            />
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-5 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
          {formatTweetContent(reference.content)}
        </p>

        <SourceLink sourceUrl={reference.sourceUrl} />
      </div>

      <div className="flex items-center gap-2 px-1 pb-0.5">
        <PlatformBadges applicableTo={reference.applicableTo} />
        <div className="min-w-0 flex-1">
          <NoteInput
            initialNote={reference.note}
            onUpdateNote={onUpdateNote}
            referenceId={reference.id}
          />
        </div>
      </div>
    </div>
  );
}
