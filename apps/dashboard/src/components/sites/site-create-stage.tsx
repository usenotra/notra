"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";

import {
  SITE_CREATE_STAGE_EDGE_PX,
  SITE_CREATE_STAGE_FIRST_OFFSET_PX,
} from "@/constants/site-create";
import { cn } from "@/lib/utils";
import type { SiteCreateStageProps } from "@/types/components/sites";

export function SiteCreateStage({
  activeIndex,
  left,
  right,
  children,
}: SiteCreateStageProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    offset: number;
    top: number;
    resized: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const column = columnRef.current;
    if (!(track && column)) {
      return;
    }
    const measure = (resized: boolean) => {
      const card = column.children[activeIndex] as HTMLElement | undefined;
      if (!card) {
        return;
      }
      const tall =
        card.offsetHeight > track.clientHeight - SITE_CREATE_STAGE_EDGE_PX * 2;
      let offset =
        track.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2);
      if (activeIndex === 0) {
        offset = SITE_CREATE_STAGE_FIRST_OFFSET_PX;
      } else if (tall) {
        offset = SITE_CREATE_STAGE_EDGE_PX - card.offsetTop;
      }
      setPosition({ offset, top: offset + card.offsetTop, resized });
    };
    measure(false);
    const observer = new ResizeObserver(() => measure(true));
    observer.observe(track);
    for (const card of column.children) {
      observer.observe(card);
    }
    return () => observer.disconnect();
  }, [activeIndex]);

  const glide = cn(
    "transition-[translate] ease-(--ease-emphasized) motion-reduce:transition-none",
    position?.resized ? "duration-200" : "duration-700"
  );
  const unplaced = position === null && "invisible duration-0";

  return (
    <div
      className="relative flex min-h-0 flex-1 justify-center gap-10"
      style={
        {
          "--stage-offset": `${position?.offset ?? 0}px`,
          "--stage-top": `${position?.top ?? 0}px`,
        } as CSSProperties
      }
    >
      <div className="relative hidden w-56 shrink-0 @min-[64rem]/main:block">
        <div
          className={cn(
            "absolute inset-x-0 top-0 translate-y-(--stage-top)",
            glide,
            unplaced
          )}
        >
          {left}
        </div>
      </div>
      <div
        className="relative max-w-xl min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_4%,black_90%,transparent)]"
        ref={trackRef}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 flex translate-y-(--stage-offset) flex-col gap-10 px-1",
            glide,
            unplaced
          )}
          ref={columnRef}
        >
          {children}
        </div>
      </div>
      <div className="relative hidden w-56 shrink-0 @min-[64rem]/main:block">
        <div
          className={cn(
            "absolute inset-x-0 top-0 translate-y-(--stage-top)",
            glide,
            unplaced
          )}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
