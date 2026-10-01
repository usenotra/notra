"use client";

import { cn } from "cn";
import {
  Check,
  Copy,
  Download,
  Ellipsis,
  RefreshCw,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  PERPLEXITY_COPIED_RESET_MS,
  PERPLEXITY_TOOLTIP_DELAY_MS,
} from "../constants/perplexity";
import type { PerplexityActionsProps } from "../types/perplexity";
import { PerplexityRewritePanel } from "./perplexity-rewrite-panel";
import { PerplexitySourcesSummary } from "./perplexity-sources-summary";

const ICON_STROKE = 1.75;

interface ActionButtonProps extends ComponentProps<typeof Button> {
  children: ReactNode;
  label: string;
  /** Wraps the button in another trigger, like a popover or menu trigger. */
  trigger?: (button: ReactElement) => ReactElement;
}

const ActionButton = ({
  children,
  label,
  trigger,
  ...props
}: ActionButtonProps) => {
  const button = (
    <Button
      aria-label={label}
      className="text-pplx-muted hover:bg-pplx-hover hover:text-pplx-fg focus-visible:ring-pplx-ring aria-expanded:bg-pplx-hover aria-expanded:text-pplx-fg dark:hover:bg-pplx-hover size-8 rounded-full transition-[color,background-color,transform] duration-150 focus-visible:border-transparent focus-visible:ring-2 active:scale-[0.96] active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none [&_svg]:size-4"
      size="icon"
      variant="ghost"
      {...props}
    />
  );

  return (
    <Tooltip>
      <TooltipTrigger render={trigger ? trigger(button) : button}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        className="bg-pplx-fg font-pplx text-pplx-bg [&>div]:bg-pplx-fg [&>div]:fill-pplx-fg rounded-md border-0 bg-none px-3 py-1.5 shadow-none [corner-shape:round]"
        side="bottom"
        sideOffset={6}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

const MENU_SURFACE_CLASS =
  "bg-pplx-popover font-pplx text-pplx-fg rounded-2xl p-1.5 shadow-[0_8px_28px_rgb(0_0_0/0.12)] ring-0 dark:shadow-[0_8px_28px_rgb(0_0_0/0.45)]";

const MENU_ITEM_CLASS =
  "focus:bg-pplx-hover focus:text-pplx-fg data-highlighted:bg-pplx-hover data-open:bg-pplx-hover data-popup-open:bg-pplx-hover h-10 cursor-pointer gap-3 rounded-xl px-3 text-[0.9375rem] focus:**:text-inherit [&_svg:not([class*='size-'])]:size-4";

export const PerplexityActions = ({
  className,
  onBadResponse,
  onDownload,
  onGoodResponse,
  models,
  onMore,
  onRewrite,
  onShare,
  sources,
  text,
  ...props
}: PerplexityActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const resetRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(resetRef.current);
    resetRef.current = window.setTimeout(
      () => setCopied(false),
      PERPLEXITY_COPIED_RESET_MS
    );
  };

  return (
    <TooltipProvider delay={PERPLEXITY_TOOLTIP_DELAY_MS}>
      <div
        className={cn(
          "flex w-full min-w-0 flex-wrap items-center gap-y-1",
          className
        )}
        data-slot="perplexity-actions"
        {...props}
      >
        <div className="flex items-center gap-1">
          <ActionButton label="Share" onClick={onShare}>
            <Share strokeWidth={ICON_STROKE} />
          </ActionButton>
          <ActionButton label="Download" onClick={onDownload}>
            <Download strokeWidth={ICON_STROKE} />
          </ActionButton>
          <ActionButton label={copied ? "Copied" : "Copy"} onClick={copy}>
            {copied ? (
              <Check strokeWidth={ICON_STROKE} />
            ) : (
              <Copy strokeWidth={ICON_STROKE} />
            )}
          </ActionButton>
          <Popover onOpenChange={setRewriteOpen} open={rewriteOpen}>
            <ActionButton
              label="Rewrite"
              trigger={(button) => <PopoverTrigger render={button} />}
            >
              <RefreshCw strokeWidth={ICON_STROKE} />
            </ActionButton>
            <PopoverContent
              align="start"
              className={cn(MENU_SURFACE_CLASS, "w-auto gap-0")}
              side="top"
              sideOffset={8}
            >
              <PerplexityRewritePanel
                models={models}
                onClose={() => setRewriteOpen(false)}
                onRewrite={onRewrite}
              />
            </PopoverContent>
          </Popover>
        </div>

        {sources && sources.length > 0 ? (
          <PerplexitySourcesSummary sources={sources} />
        ) : null}

        <div className="ms-auto flex items-center gap-1">
          <ActionButton label="Good response" onClick={onGoodResponse}>
            <ThumbsUp strokeWidth={ICON_STROKE} />
          </ActionButton>
          <ActionButton label="Bad response" onClick={onBadResponse}>
            <ThumbsDown strokeWidth={ICON_STROKE} />
          </ActionButton>
          <DropdownMenu onOpenChange={setMoreOpen} open={moreOpen}>
            <ActionButton
              label="More"
              onClick={onMore}
              trigger={(button) => <DropdownMenuTrigger render={button} />}
            >
              <Ellipsis strokeWidth={ICON_STROKE} />
            </ActionButton>
            <DropdownMenuContent
              align="end"
              className={cn(MENU_SURFACE_CLASS, "min-w-44")}
              side="bottom"
              sideOffset={8}
            >
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                onClick={onDownload}
              >
                <Download strokeWidth={ICON_STROKE} />
                Download
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={MENU_ITEM_CLASS}>
                  <RefreshCw strokeWidth={ICON_STROKE} />
                  Rewrite
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className={cn(MENU_SURFACE_CLASS, "w-auto")}
                  sideOffset={8}
                >
                  <PerplexityRewritePanel
                    models={models}
                    onClose={() => setMoreOpen(false)}
                    onRewrite={onRewrite}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
};
