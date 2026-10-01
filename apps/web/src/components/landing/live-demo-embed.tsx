"use client";

import { ArrowExpand01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type MouseEvent } from "react";

import {
  LIVE_DEMO_CLOSE_LABEL,
  LIVE_DEMO_EMBED_URL,
  LIVE_DEMO_FALLBACK_URL,
  LIVE_DEMO_IFRAME_SANDBOX,
  LIVE_DEMO_IFRAME_TITLE,
  LIVE_DEMO_OPEN_LABEL,
} from "@/constants/landing/live-demo";

export function LiveDemoEmbed() {
  const [expanded, setExpanded] = useState(false);

  const trackFullscreen = (node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }
    const sync = () => setExpanded(document.fullscreenElement === node);
    node.addEventListener("fullscreenchange", sync);
    return () => node.removeEventListener("fullscreenchange", sync);
  };

  const openFullscreen = async (event: MouseEvent<HTMLButtonElement>) => {
    const container = event.currentTarget.parentElement;
    if (!container?.requestFullscreen) {
      window.open(LIVE_DEMO_FALLBACK_URL, "_blank", "noopener");
      return;
    }
    await container.requestFullscreen();
  };

  return (
    <div className="h-[36rem] w-full max-w-[64rem] lg:h-auto lg:flex-1">
      <div
        className="group border-border bg-background relative size-full overflow-hidden rounded-2xl border lg:rounded-b-none lg:border-b-0 [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
        ref={trackFullscreen}
      >
        <iframe
          allow="clipboard-write"
          className="size-full"
          inert={!expanded}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={LIVE_DEMO_IFRAME_SANDBOX}
          src={LIVE_DEMO_EMBED_URL}
          title={LIVE_DEMO_IFRAME_TITLE}
        />
        {expanded ? (
          <button
            aria-label={LIVE_DEMO_CLOSE_LABEL}
            className="bg-foreground text-background absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full"
            onClick={() => document.exitFullscreen()}
            type="button"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        ) : (
          <button
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30 focus-visible:bg-black/30"
            onClick={openFullscreen}
            type="button"
          >
            <span className="bg-foreground text-background flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100">
              <HugeiconsIcon icon={ArrowExpand01Icon} size={16} />
              {LIVE_DEMO_OPEN_LABEL}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
