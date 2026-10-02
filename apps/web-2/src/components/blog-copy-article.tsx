import {
  ArrowDown01Icon,
  Copy01Icon,
  File01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type {
  BlogCopyArticleItemProps,
  BlogCopyArticleProps,
} from "~types/blog";

import {
  buildChatGptUrl,
  buildClaudeUrl,
  openInNewTab,
} from "@/utils/article-ai-links";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

const COPIED_STATE_DURATION_MS = 2000;

function CopyArticleMenuItemContent({
  icon,
  title,
  description,
}: BlogCopyArticleItemProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-foreground text-sm font-medium">{title}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </span>
    </div>
  );
}

export function BlogCopyArticle({
  markdown,
  markdownUrl,
  title,
}: BlogCopyArticleProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    const success = await copyToClipboard(
      markdown,
      "Article copied as Markdown"
    );

    if (!success) {
      return;
    }

    setCopied(true);

    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current);
    }

    copiedTimer.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_STATE_DURATION_MS);
  }

  return (
    <div className="text-foreground/60 flex items-center gap-2 font-mono text-sm">
      <button
        className="hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 transition-colors"
        onClick={handleCopy}
        type="button"
      >
        <HugeiconsIcon
          className="size-4"
          icon={copied ? Tick02Icon : Copy01Icon}
          strokeWidth={2}
        />
        <span>{copied ? "Copied" : "Copy article"}</span>
      </button>

      <span aria-hidden="true" className="text-foreground/20">
        |
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More article options"
          className="hover:text-foreground inline-flex cursor-pointer items-center transition-colors"
        >
          <HugeiconsIcon
            className="size-4"
            icon={ArrowDown01Icon}
            strokeWidth={2}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-2">
          <DropdownMenuItem
            className="px-2 py-2"
            closeOnClick={false}
            onClick={handleCopy}
          >
            <CopyArticleMenuItemContent
              description="Copy article as Markdown for LLMs"
              icon={<HugeiconsIcon className="size-5" icon={Copy01Icon} />}
              title="Copy article"
            />
          </DropdownMenuItem>

          <DropdownMenuItem
            className="px-2 py-2"
            render={<Link to={markdownUrl} />}
          >
            <CopyArticleMenuItemContent
              description="View this article as plain text"
              icon={<HugeiconsIcon className="size-5" icon={File01Icon} />}
              title="View as Markdown"
            />
          </DropdownMenuItem>

          <DropdownMenuItem
            className="px-2 py-2"
            onClick={() => openInNewTab(buildChatGptUrl(title, markdownUrl))}
          >
            <CopyArticleMenuItemContent
              description="Ask questions about this article"
              icon={<Openai className="size-5 dark:invert" />}
              title="Open in ChatGPT"
            />
          </DropdownMenuItem>

          <DropdownMenuItem
            className="px-2 py-2"
            onClick={() => openInNewTab(buildClaudeUrl(title, markdownUrl))}
          >
            <CopyArticleMenuItemContent
              description="Ask questions about this article"
              icon={<ClaudeAiIcon className="size-5" />}
              title="Open in Claude"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
