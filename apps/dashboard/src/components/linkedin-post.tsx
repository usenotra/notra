"use client";

import {
  ArrowDown01Icon,
  Cancel01Icon,
  Clapping02Icon,
  Comment01Icon,
  FavouriteIcon,
  GlobalIcon,
  MoreHorizontalIcon,
  RepostIcon,
  SentIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TextSelection } from "@notra/schemas/dashboard/content";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Card } from "@notra/ui/components/ui/card";
import { Separator } from "@notra/ui/components/ui/separator";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import Image from "next/image";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { SocialAccountSelector } from "@/components/content/social-account-selector";
import { LINKEDIN_TRUNCATION_LIMIT } from "@/constants/linkedin";
import { cn } from "@/lib/utils";
import type { LinkedInPostProps } from "@/types/content/linkedin-post";

const reactionColors: Record<string, string> = {
  like: "#378FE9",
  love: "#DF704D",
  celebrate: "#D0A819",
};

const reactionIcons: Record<string, typeof ThumbsUpIcon> = {
  like: ThumbsUpIcon,
  love: FavouriteIcon,
  celebrate: Clapping02Icon,
};

function ReactionDot({ type }: { type: string }) {
  return (
    <span
      className="ring-background flex size-4 items-center justify-center rounded-full text-white ring-1"
      style={{ backgroundColor: reactionColors[type] ?? reactionColors.like }}
    >
      <HugeiconsIcon
        className="size-2.5"
        icon={reactionIcons[type] ?? ThumbsUpIcon}
      />
    </span>
  );
}

function generateMockLinkedInUrl(originalUrl: string): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let hash = 0;
  for (let i = 0; i < originalUrl.length; i++) {
    hash = (hash * 31 + originalUrl.charCodeAt(i)) % 2_147_483_647;
  }

  let id = "";
  let value = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(value % chars.length);
    value = Math.floor(value / chars.length);
  }

  return `https://lnkd.in/${id}`;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const COMBINED_REGEX = /(https?:\/\/[^\s]+|#\w+)/g;

const LINKEDIN_EDITOR_TEXT_STYLE: React.CSSProperties = {
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  letterSpacing: "normal",
  fontFamily: "inherit",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "normal",
};

const LINKEDIN_EDITOR_OVERLAY_STYLE: React.CSSProperties = {
  ...LINKEDIN_EDITOR_TEXT_STYLE,
  color: "transparent",
};

function formatContentWithHashtagsAndLinks(text: string): React.ReactNode[] {
  const parts = text.split(COMBINED_REGEX);
  return parts.map((part, index) => {
    if (part.startsWith("#")) {
      return (
        <span
          className="hover:decoration-foreground cursor-pointer text-blue-600 hover:underline hover:underline-offset-2"
          key={index}
        >
          {part}
        </span>
      );
    }
    if (part.match(URL_REGEX)) {
      const mockUrl = generateMockLinkedInUrl(part);
      return (
        <Tooltip key={index}>
          <TooltipTrigger
            render={
              <span className="hover:decoration-foreground cursor-pointer text-blue-600 hover:underline hover:underline-offset-2" />
            }
          >
            {mockUrl}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Mock link (actual: {part})</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return part;
  });
}

function PostContent({
  content,
  truncate,
  truncationLimit = LINKEDIN_TRUNCATION_LIMIT,
  defaultExpanded = true,
  onSelectionChange,
}: {
  content: string;
  truncate?: boolean;
  truncationLimit?: number;
  defaultExpanded?: boolean;
  onSelectionChange?: (selection: TextSelection | null) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const canTruncate = truncate && content.length > truncationLimit;
  const isCollapsed = canTruncate && !expanded;
  const displayContent = isCollapsed
    ? content.slice(0, truncationLimit).trimEnd()
    : content;

  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const container = contentRef.current;
      if (!selection || !container) {
        return;
      }

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      if (!anchorNode || !focusNode) {
        return;
      }

      if (!container.contains(anchorNode) || !container.contains(focusNode)) {
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        return;
      }

      const startIndex = content.indexOf(selectedText);
      if (startIndex === -1) {
        return;
      }

      const beforeText = content.substring(0, startIndex);
      const lines = beforeText.split("\n");
      const startLine = lines.length;
      const startChar = (lines.at(-1)?.length ?? 0) + 1;

      const selectedLines = selectedText.split("\n");
      const endLine = startLine + selectedLines.length - 1;
      const endChar =
        selectedLines.length === 1
          ? startChar + selectedText.length
          : (selectedLines.at(-1)?.length ?? 0) + 1;

      onSelectionChange({
        text: selectedText,
        startLine,
        startChar,
        endLine,
        endChar,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [content, onSelectionChange]);

  return (
    <div className="text-sm" ref={contentRef}>
      <span className="whitespace-pre-wrap">
        {formatContentWithHashtagsAndLinks(displayContent)}
      </span>
      {isCollapsed && (
        <button
          className="text-muted-foreground hover:text-foreground ml-2 cursor-pointer font-medium hover:underline"
          onClick={() => setExpanded(true)}
          type="button"
        >
          …more
        </button>
      )}
    </div>
  );
}

function LinkedInPost({
  author,
  accountSelector,
  content,
  onContentChange,
  onSelectionChange,
  image,
  reactions,
  comments,
  reposts,
  timestamp,
  onLike,
  onComment,
  onRepost,
  onSend,
  onClose,
  truncate,
  truncationLimit,
  defaultExpanded,
  className,
  ...props
}: LinkedInPostProps) {
  const reactionTypes = reactions?.types ?? ["like"];
  const hasEngagement =
    (reactions?.count ?? 0) > 0 || (comments ?? 0) > 0 || (reposts ?? 0) > 0;
  const isEditable = Boolean(onContentChange);
  const hasAccountSelector =
    accountSelector !== undefined && accountSelector.accounts.length > 1;

  const [localValue, setLocalValue] = useState(() => content ?? "");

  const authorName = (
    <span className="truncate text-sm leading-tight font-semibold">
      {author.name}
    </span>
  );

  const readOnlyContent = content ? (
    <PostContent
      content={content}
      defaultExpanded={defaultExpanded}
      onSelectionChange={onSelectionChange}
      truncate={truncate}
      truncationLimit={truncationLimit}
    />
  ) : null;

  if ((content ?? "") !== localValue) {
    setLocalValue(content ?? "");
  }

  return (
    <Card className={cn("grid h-fit gap-0 py-0", className)} {...props}>
      <div className="flex items-start gap-2 px-4 pt-3 pb-1">
        <Avatar className="size-12" size="lg">
          {author.avatar && <AvatarImage src={author.avatar} />}
          <AvatarFallback>
            {author.fallback ?? author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {hasAccountSelector ? (
            <SocialAccountSelector
              accounts={accountSelector.accounts}
              className="-mx-1 max-w-full px-1"
              onSelect={accountSelector.onSelect}
              trigger={
                <>
                  {authorName}
                  <HugeiconsIcon
                    className="text-muted-foreground size-3.5 shrink-0"
                    icon={ArrowDown01Icon}
                  />
                </>
              }
            />
          ) : (
            <p className="text-sm leading-tight font-semibold">{author.name}</p>
          )}
          {author.headline && (
            <p className="text-muted-foreground truncate text-xs leading-tight">
              {author.headline}
            </p>
          )}
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            {timestamp && <span>{timestamp}</span>}
            {timestamp && <span>·</span>}
            <HugeiconsIcon className="size-3" icon={GlobalIcon} />
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            className="text-muted-foreground"
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-5" icon={MoreHorizontalIcon} />
          </Button>
          <Button
            className="text-muted-foreground"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-5" icon={Cancel01Icon} />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-2">
        {isEditable ? (
          <div className="grid w-full grid-cols-1">
            <div
              aria-hidden
              className="pointer-events-none col-start-1 row-start-1 min-h-[6.5rem] min-w-0"
              style={LINKEDIN_EDITOR_TEXT_STYLE}
            >
              {formatContentWithHashtagsAndLinks(localValue)}
              {"\u200b"}
            </div>
            <Textarea
              className="caret-foreground col-start-1 row-start-1 field-sizing-content min-h-[6.5rem] min-w-0 resize-none overflow-hidden rounded-none border-none bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              onChange={(e) => {
                const value = e.target.value;
                setLocalValue(value);
                onContentChange?.(value);
              }}
              placeholder="What do you want to talk about?"
              spellCheck={false}
              style={LINKEDIN_EDITOR_OVERLAY_STYLE}
              value={localValue}
            />
          </div>
        ) : (
          readOnlyContent
        )}
      </div>

      {image && (
        <div className="bg-muted">
          <Image
            alt={image.alt}
            className="w-full object-cover"
            height={100}
            src={image.src}
            width={100}
          />
        </div>
      )}

      {hasEngagement && (
        <div className="flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-1">
            {reactions?.count && reactions.count > 0 && (
              <>
                <div className="flex -space-x-0.5">
                  {reactionTypes.map((type) => (
                    <ReactionDot key={type} type={type} />
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">
                  {reactions.count.toLocaleString()}
                </span>
              </>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {(comments ?? 0) > 0 && (
              <span>{comments?.toLocaleString()} comments</span>
            )}
            {(reposts ?? 0) > 0 && (
              <span>{reposts?.toLocaleString()} reposts</span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-2 py-2">
        <Separator className="mx-4" />

        <div className="flex items-center justify-around px-2">
          <Button
            className="text-muted-foreground flex-1 gap-1.5"
            onClick={onLike}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={ThumbsUpIcon} />
            <span className="text-xs">Like</span>
          </Button>
          <Button
            className="text-muted-foreground flex-1 gap-1.5"
            onClick={onComment}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={Comment01Icon} />
            <span className="text-xs">Comment</span>
          </Button>
          <Button
            className="text-muted-foreground flex-1 gap-1.5"
            onClick={onRepost}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={RepostIcon} />
            <span className="text-xs">Repost</span>
          </Button>
          <Button
            className="text-muted-foreground flex-1 gap-1.5"
            onClick={onSend}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={SentIcon} />
            <span className="text-xs">Send</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { LinkedInPost };
