"use client";

import { cn } from "cn";
import { ArrowDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { CHATGPT_SCROLL_STICK_THRESHOLD_PX } from "../constants/chatgpt";
import type { ChatgptThreadProps } from "../types/chatgpt";

const distanceFromBottom = (element: HTMLElement) =>
  element.scrollHeight - element.scrollTop - element.clientHeight;

const getViewport = (root: HTMLDivElement | null) =>
  root?.querySelector<HTMLDivElement>("[data-slot=scroll-area-viewport]") ??
  null;

export const ChatgptThread = ({
  autoScroll = true,
  children,
  className,
  footer,
  ...props
}: ChatgptThreadProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const viewport = getViewport(scrollAreaRef.current);
    if (!viewport) {
      return;
    }
    const handleScroll = () => {
      const nearBottom =
        distanceFromBottom(viewport) <= CHATGPT_SCROLL_STICK_THRESHOLD_PX;
      stickRef.current = nearBottom;
      setAtBottom(nearBottom);
    };
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const viewport = getViewport(scrollAreaRef.current);
    const content = contentRef.current;
    if (!(autoScroll && viewport && content)) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (stickRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [autoScroll]);

  const scrollToBottom = () => {
    const viewport = getViewport(scrollAreaRef.current);
    if (!viewport) {
      return;
    }
    stickRef.current = true;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    viewport.scrollTo({
      behavior: reduceMotion ? "auto" : "smooth",
      top: viewport.scrollHeight,
    });
  };

  return (
    <div
      className={cn(
        "bg-chatgpt-bg font-chatgpt text-chatgpt-fg relative flex min-h-0 flex-col antialiased",
        className
      )}
      data-slot="chatgpt-thread"
      {...props}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ScrollArea
          className="min-h-0 flex-1 overscroll-contain"
          ref={scrollAreaRef}
        >
          <div
            className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8"
            ref={contentRef}
          >
            {children}
          </div>
        </ScrollArea>
        {!atBottom && (
          <Button
            aria-label="Scroll to bottom"
            className="border-chatgpt-border bg-chatgpt-bg text-chatgpt-fg hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:bg-chatgpt-bg dark:hover:bg-chatgpt-hover absolute bottom-3 left-1/2 size-8 -translate-x-1/2 rounded-full shadow-sm transition-opacity duration-150 focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none starting:opacity-0"
            onClick={scrollToBottom}
            size="icon"
            variant="ghost"
          >
            <ArrowDownIcon className="size-4" />
          </Button>
        )}
      </div>
      {footer && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">{footer}</div>
      )}
    </div>
  );
};
