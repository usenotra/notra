"use client";

import {
  ArrowDown01Icon,
  Bookmark02Icon,
  Comment01Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TextSelection } from "@notra/schemas/dashboard/content";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Card } from "@notra/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Textarea } from "@notra/ui/components/ui/textarea";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { SocialAccountSelector } from "@/components/content/social-account-selector";
import { XVerificationBadge } from "@/components/icons/x-verification-badge";
import {
  TWEET_COUNTER_RING_CIRCUMFERENCE,
  TWEET_COUNTER_RING_RADIUS,
  TWEET_COUNTER_RING_SIZE,
  TWEET_COUNTER_RING_STROKE,
  TWEET_COUNTER_WARNING_RATIO,
  TWEET_COUNTER_WARNING_REMAINING,
} from "@/constants/twitter";
import { cn } from "@/lib/utils";
import type { TwitterPostProps } from "@/types/content/twitter-post";
import { formatTweetContent } from "@/utils/format-tweet-content";
import {
  getTwitterCharLimit,
  getWeightedTweetLength,
  isSquareTwitterAvatar,
} from "@/utils/twitter";

const TWEET_EDITOR_TEXT_STYLE: React.CSSProperties = {
  fontSize: "0.9375rem",
  lineHeight: "1.375",
  letterSpacing: "normal",
  fontFamily: "inherit",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "normal",
};

const TWEET_EDITOR_OVERLAY_STYLE: React.CSSProperties = {
  ...TWEET_EDITOR_TEXT_STYLE,
  color: "transparent",
};

function TweetContent({
  content,
  onSelectionChange,
}: {
  content: string;
  onSelectionChange?: (selection: TextSelection | null) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

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
    <div
      className="text-[0.9375rem] leading-snug whitespace-pre-wrap"
      ref={contentRef}
    >
      {formatTweetContent(content)}
    </div>
  );
}

function CharacterCounter({ count, limit }: { count: number; limit: number }) {
  const remaining = limit - count;
  const isOver = remaining < 0;
  const warningThreshold = Math.max(
    TWEET_COUNTER_WARNING_REMAINING,
    Math.round(limit * TWEET_COUNTER_WARNING_RATIO)
  );
  const isWarning = remaining >= 0 && remaining <= warningThreshold;
  const progress = Math.min(count / limit, 1);

  return (
    <span className="flex items-center gap-1.5">
      {(isWarning || isOver) && (
        <span
          className={cn(
            "text-xs tabular-nums",
            isOver ? "text-destructive font-medium" : "text-warning"
          )}
        >
          {remaining}
        </span>
      )}
      <svg
        aria-label={`${count} of ${limit} characters used`}
        className="-rotate-90"
        height={TWEET_COUNTER_RING_SIZE}
        role="img"
        width={TWEET_COUNTER_RING_SIZE}
      >
        <circle
          className="stroke-muted"
          cx={TWEET_COUNTER_RING_SIZE / 2}
          cy={TWEET_COUNTER_RING_SIZE / 2}
          fill="none"
          r={TWEET_COUNTER_RING_RADIUS}
          strokeWidth={TWEET_COUNTER_RING_STROKE}
        />
        <circle
          className={cn(
            isOver && "stroke-destructive",
            isWarning && "stroke-warning",
            !(isOver || isWarning) && "stroke-primary"
          )}
          cx={TWEET_COUNTER_RING_SIZE / 2}
          cy={TWEET_COUNTER_RING_SIZE / 2}
          fill="none"
          r={TWEET_COUNTER_RING_RADIUS}
          strokeDasharray={TWEET_COUNTER_RING_CIRCUMFERENCE}
          strokeDashoffset={TWEET_COUNTER_RING_CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          strokeWidth={TWEET_COUNTER_RING_STROKE}
        />
      </svg>
    </span>
  );
}

function TwitterPost({
  author,
  accountSelector,
  content,
  onContentChange,
  onSelectionChange,
  timestamp,
  menuItems,
  className,
  ...props
}: TwitterPostProps) {
  const isEditable = Boolean(onContentChange);
  const hasSquareAvatar = isSquareTwitterAvatar(author.verifiedType);
  const hasAccountSelector =
    accountSelector !== undefined && accountSelector.accounts.length > 1;
  const [localValue, setLocalValue] = useState(() => content ?? "");

  const readOnlyContent = content ? (
    <TweetContent content={content} onSelectionChange={onSelectionChange} />
  ) : null;

  const authorIdentity = (
    <>
      <span className="truncate text-[0.9375rem] leading-tight font-bold">
        {author.name}
      </span>
      <XVerificationBadge
        className="size-4 shrink-0"
        verified={author.verified ?? false}
        verifiedType={author.verifiedType ?? null}
      />
      {author.handle && (
        <span className="text-muted-foreground truncate text-[0.9375rem]">
          @{author.handle}
        </span>
      )}
    </>
  );

  if ((content ?? "") !== localValue) {
    setLocalValue(content ?? "");
  }

  return (
    <Card
      className={cn("flex h-full flex-col gap-0 py-0", className)}
      {...props}
    >
      <div className="flex flex-1 gap-3 px-4 pt-3">
        <Avatar className={cn("size-10", hasSquareAvatar && "rounded-md")}>
          {author.avatar && <AvatarImage src={author.avatar} />}
          <AvatarFallback>
            {author.fallback ?? author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1">
            {hasAccountSelector ? (
              <SocialAccountSelector
                accounts={accountSelector.accounts}
                className="-mx-1 px-1"
                onSelect={accountSelector.onSelect}
                trigger={
                  <>
                    {authorIdentity}
                    <HugeiconsIcon
                      className="text-muted-foreground size-3.5 shrink-0"
                      icon={ArrowDown01Icon}
                    />
                  </>
                }
              />
            ) : (
              authorIdentity
            )}
            {timestamp && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground shrink-0 text-[0.9375rem]">
                  {timestamp}
                </span>
              </>
            )}
            {menuItems && menuItems.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:bg-accent ml-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full">
                  <HugeiconsIcon className="size-4" icon={MoreHorizontalIcon} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuItems.map((item) => (
                    <DropdownMenuItem
                      key={item.label}
                      onClick={item.onClick}
                      variant={item.variant}
                    >
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className="text-muted-foreground ml-auto"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={MoreHorizontalIcon} />
              </Button>
            )}
          </div>

          <div className="flex flex-1 flex-col pb-3">
            {isEditable ? (
              <div className="space-y-1">
                <div className="grid w-full grid-cols-1">
                  <div
                    aria-hidden
                    className="pointer-events-none col-start-1 row-start-1 min-h-[4rem] min-w-0"
                    style={TWEET_EDITOR_TEXT_STYLE}
                  >
                    {formatTweetContent(localValue)}
                    {"\u200b"}
                  </div>
                  <Textarea
                    className="caret-foreground col-start-1 row-start-1 field-sizing-content min-h-[4rem] min-w-0 resize-none overflow-hidden rounded-none border-none bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocalValue(value);
                      onContentChange?.(value);
                    }}
                    placeholder="What is happening?!"
                    spellCheck={false}
                    style={TWEET_EDITOR_OVERLAY_STYLE}
                    value={localValue}
                  />
                </div>
                <div className="flex justify-end">
                  <CharacterCounter
                    count={getWeightedTweetLength(localValue)}
                    limit={getTwitterCharLimit(author.verifiedType)}
                  />
                </div>
              </div>
            ) : (
              readOnlyContent
            )}

            <div className="mt-auto flex items-center justify-between pt-2">
              <Button
                className="text-muted-foreground gap-1.5"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={Comment01Icon} />
              </Button>
              <Button
                className="text-muted-foreground gap-1.5"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={RepeatIcon} />
              </Button>
              <Button
                className="text-muted-foreground gap-1.5"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-4" icon={FavouriteIcon} />
              </Button>
              <div className="flex items-center gap-0.5">
                <Button
                  className="text-muted-foreground"
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-4" icon={Bookmark02Icon} />
                </Button>
                <Button
                  className="text-muted-foreground"
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-4" icon={Share01Icon} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export { TwitterPost };
