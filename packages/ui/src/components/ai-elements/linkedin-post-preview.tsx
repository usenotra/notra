"use client";

import {
  Comment01Icon,
  GlobalIcon,
  MoreHorizontalIcon,
  RepostIcon,
  SentIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button } from "@notra/ui/components/ui/button";
import { Separator } from "@notra/ui/components/ui/separator";
import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";

const DEFAULT_TRUNCATION_LIMIT = 200;
const URL_REGEX = /^https?:\/\/[^\s]+$/;
const HASHTAG_REGEX = /^#\w+$/;
const COMBINED_REGEX = /(https?:\/\/[^\s]+|#\w+)/g;

function formatContent(text: string): ReactNode[] {
  const parts = text.split(COMBINED_REGEX);
  return parts.map((part, index) => {
    if (HASHTAG_REGEX.test(part)) {
      return (
        <span className="text-blue-600" key={index}>
          {part}
        </span>
      );
    }
    if (URL_REGEX.test(part)) {
      return (
        <span className="text-blue-600" key={index}>
          {part}
        </span>
      );
    }
    return part;
  });
}

interface LinkedInPostPreviewProps {
  author: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp?: string;
  className?: string;
  truncationLimit?: number;
}

export function LinkedInPostPreview({
  author,
  content,
  timestamp = "Just now",
  className,
  truncationLimit = DEFAULT_TRUNCATION_LIMIT,
}: LinkedInPostPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const canTruncate = content.length > truncationLimit;
  const isCollapsed = canTruncate && !expanded;
  const displayContent = isCollapsed
    ? content.slice(0, truncationLimit).trimEnd()
    : content;

  return (
    <div
      className={cn(
        "grid h-fit gap-0 rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
        <Avatar className="size-8">
          {author.avatar && <AvatarImage src={author.avatar} />}
          <AvatarFallback className="text-[0.625rem]">
            {author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-xs leading-tight">{author.name}</p>
          <div className="flex items-center gap-1 text-muted-foreground text-[0.625rem]">
            <span>{timestamp}</span>
            <span>·</span>
            <HugeiconsIcon className="size-2.5" icon={GlobalIcon} />
          </div>
        </div>
        <Button
          aria-label="More options"
          className="size-6 text-muted-foreground"
          size="icon-sm"
          variant="ghost"
        >
          <HugeiconsIcon className="size-3.5" icon={MoreHorizontalIcon} />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="text-xs leading-relaxed">
          <span className="whitespace-pre-wrap">
            {formatContent(displayContent)}
          </span>
          {isCollapsed && (
            <button
              className="ml-1 cursor-pointer font-medium text-muted-foreground text-xs hover:text-foreground hover:underline"
              onClick={() => setExpanded(true)}
              type="button"
            >
              …more
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-1 py-1.5">
        <Separator className="mx-3" />
        <div className="flex items-center justify-around px-1.5">
          <Button
            className="flex-1 gap-1 text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-3" icon={ThumbsUpIcon} />
            <span className="text-[0.625rem]">Like</span>
          </Button>
          <Button
            className="flex-1 gap-1 text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-3" icon={Comment01Icon} />
            <span className="text-[0.625rem]">Comment</span>
          </Button>
          <Button
            className="flex-1 gap-1 text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-3" icon={RepostIcon} />
            <span className="text-[0.625rem]">Repost</span>
          </Button>
          <Button
            className="flex-1 gap-1 text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-3" icon={SentIcon} />
            <span className="text-[0.625rem]">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
