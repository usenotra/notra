"use client";

import {
  Bookmark02Icon,
  Comment01Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button } from "@notra/ui/components/ui/button";


import type { ReactNode } from "react";
import { cn } from "@notra/ui/lib/utils";

const TOKEN_REGEX =
  /(@\w{1,15}|#\w+|https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

function formatContent(content: string): ReactNode[] {
  TOKEN_REGEX.lastIndex = 0;
  const parts = content.split(TOKEN_REGEX);
  TOKEN_REGEX.lastIndex = 0;

  return parts.map((part, i) => {
    TOKEN_REGEX.lastIndex = 0;
    if (TOKEN_REGEX.test(part)) {
      TOKEN_REGEX.lastIndex = 0;
      return (
        <span className="text-sky-500" key={`${i}-${part}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}

interface TwitterPostPreviewProps {
  author: {
    name: string;
    avatar?: string;
    handle?: string;
  };
  content: string;
  timestamp?: string;
  className?: string;
}

export function TwitterPostPreview({
  author,
  content,
  timestamp = "Just now",
  className,
}: TwitterPostPreviewProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-0 rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex flex-1 gap-2.5 px-3 pt-2.5">
        <Avatar className="size-8">
          {author.avatar && <AvatarImage src={author.avatar} />}
          <AvatarFallback className="text-[0.625rem]">
            {author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1">
            <span className="truncate font-bold text-xs leading-tight">
              {author.name}
            </span>
            {author.handle && (
              <span className="truncate text-muted-foreground text-xs">
                @{author.handle}
              </span>
            )}
            {timestamp && (
              <>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {timestamp}
                </span>
              </>
            )}
            <Button
              aria-label="More options"
              className="ml-auto size-5 text-muted-foreground"
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon className="size-3" icon={MoreHorizontalIcon} />
            </Button>
          </div>

          <div className="flex flex-1 flex-col pb-2.5">
            <div className="whitespace-pre-wrap text-xs leading-relaxed">
              {formatContent(content)}
            </div>

            <div className="mt-auto flex items-center justify-between pt-1.5">
              <Button
                aria-label="Comment"
                className="gap-1 text-muted-foreground"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-3" icon={Comment01Icon} />
              </Button>
              <Button
                aria-label="Repost"
                className="gap-1 text-muted-foreground"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-3" icon={RepeatIcon} />
              </Button>
              <Button
                aria-label="Like"
                className="gap-1 text-muted-foreground"
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon className="size-3" icon={FavouriteIcon} />
              </Button>
              <div className="flex items-center gap-0.5">
                <Button
                  aria-label="Bookmark"
                  className="text-muted-foreground"
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3" icon={Bookmark02Icon} />
                </Button>
                <Button
                  aria-label="Share"
                  className="text-muted-foreground"
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3" icon={Share01Icon} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
