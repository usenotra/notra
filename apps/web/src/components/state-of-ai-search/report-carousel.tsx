"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@notra/ui/components/ui/carousel";
import { CarouselProgress } from "@notra/ui/components/ui/carousel-progress";
import { cn } from "@notra/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ReportPanel } from "@/components/state-of-ai-search/report-section";
import { Brand } from "@/components/state-of-ai-search/report-tables";
import type { StateOfAiSearchSummary } from "@/types/state-of-ai-search";
import { brandColor, formatPercent } from "@/utils/state-of-ai-search";

const PERCENT_MAX = 100;
const PROGRESS_FULL = 100;
/** Horizontal wheel distance that counts as one swipe. */
const WHEEL_SWIPE_THRESHOLD = 40;
/** Quiet time that ends a trackpad gesture. */
const WHEEL_GESTURE_GAP_MS = 180;
/** No new swipe right after one fired, while the board is still moving. */
const WHEEL_MIN_SWIPE_INTERVAL_MS = 300;
/** A gesture counts as coasting once it fell below this share of its peak. */
const WHEEL_DECAY_RATIO = 0.5;
/**
 * A new swipe while coasting: the delta jumps to at least this multiple of
 * the slowest coasting delta and past an absolute floor, so momentum jitter
 * does not count.
 */
const WHEEL_RESTART_RATIO = 2.5;
const WHEEL_RESTART_MIN_DELTA = 12;

/**
 * Trackpad swipes move one board per gesture. Embla only follows pointer
 * drags, and its wheel plugin is a dependency we do not need for this.
 */
function useWheelSwipe(api: CarouselApi) {
  useEffect(() => {
    const root = api?.rootNode();
    if (!(api && root)) {
      return;
    }
    let distance = 0;
    let fired = false;
    let firedAt = 0;
    let peak = 0;
    let coasting = false;
    let floor = Number.POSITIVE_INFINITY;
    let gestureEnd: number | undefined;
    const reset = () => {
      distance = 0;
      fired = false;
      peak = 0;
      coasting = false;
      floor = Number.POSITIVE_INFINITY;
    };
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return;
      }
      event.preventDefault();
      window.clearTimeout(gestureEnd);
      gestureEnd = window.setTimeout(reset, WHEEL_GESTURE_GAP_MS);

      const delta = Math.abs(event.deltaX);
      if (fired) {
        const settled =
          event.timeStamp - firedAt >= WHEEL_MIN_SWIPE_INTERVAL_MS;
        const reversed =
          delta >= WHEEL_RESTART_MIN_DELTA &&
          Math.sign(event.deltaX) !== Math.sign(distance);
        const restarted =
          coasting &&
          delta >= WHEEL_RESTART_MIN_DELTA &&
          delta >= floor * WHEEL_RESTART_RATIO;
        if (settled && (reversed || restarted)) {
          reset();
        } else {
          peak = Math.max(peak, delta);
          if (delta <= peak * WHEEL_DECAY_RATIO) {
            coasting = true;
          }
          if (coasting) {
            floor = Math.min(floor, delta);
          }
          return;
        }
      }
      peak = Math.max(peak, delta);
      distance += event.deltaX;
      if (Math.abs(distance) >= WHEEL_SWIPE_THRESHOLD) {
        fired = true;
        firedAt = event.timeStamp;
        if (distance > 0) {
          api.scrollNext();
        } else {
          api.scrollPrev();
        }
      }
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      window.clearTimeout(gestureEnd);
    };
  }, [api]);
}

/** One category's leaderboard: the board in the middle of the carousel. */
function ReportBoard({
  report,
  active,
}: {
  report: StateOfAiSearchSummary;
  active: boolean;
}) {
  return (
    <ReportPanel
      bodyClassName="flex flex-col"
      className={cn(
        "transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
        active ? "opacity-100" : "scale-[0.96] opacity-50"
      )}
      header={
        <>
          <span className="text-foreground">{report.subject}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {report.engines.map((engine) => (
              <EngineIcon
                className="size-3.5"
                engine={engine.model}
                key={engine.id}
              />
            ))}
          </span>
        </>
      }
    >
      <div className="border-border/60 flex items-baseline justify-between gap-4 border-b px-4 py-3">
        <p className="text-muted-foreground text-sm">
          Best {report.noun}, according to AI
        </p>
        <span className="text-muted-foreground shrink-0 text-xs">
          {report.editionLabel}
        </span>
      </div>
      <ol className="divide-border/60 divide-y">
        {report.leaders.map((row) => (
          <li
            className="flex h-12 items-center gap-3 px-4 text-sm tabular-nums"
            key={row.name}
          >
            <span className="text-muted-foreground w-3">{row.rank}</span>
            <span className="min-w-0 flex-1">
              <Brand domain={row.domain} name={row.name} />
            </span>
            <GeoBar
              className="w-16 sm:w-24"
              fillColor={brandColor(row.rank)}
              max={PERCENT_MAX}
              value={row.visibility}
            />
            <span className="w-10 text-right font-medium">
              {formatPercent(row.visibility)}
            </span>
          </li>
        ))}
      </ol>
      <Link
        className="text-muted-foreground hover:text-foreground border-border/60 flex h-11 items-center justify-between border-t px-4 text-sm font-medium transition-colors"
        params={{ category: report.slug, edition: report.edition }}
        tabIndex={active ? 0 : -1}
        to="/state-of-ai-search/$category/$edition"
      >
        Read the {report.subject} report
        <HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
      </Link>
    </ReportPanel>
  );
}

/**
 * Other categories as a swipeable row of boards: the current one in the
 * middle at full strength, its neighbours peeking in at the sides.
 */
export function ReportCarousel({
  reports,
}: {
  reports: StateOfAiSearchSummary[];
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  useWheelSwipe(api);

  useEffect(() => {
    if (!api) {
      return;
    }
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <div className="flex flex-col gap-4">
      <Carousel
        className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
        opts={{ align: "center", loop: true }}
        setApi={setApi}
      >
        <CarouselContent>
          {reports.map((report, index) => (
            <CarouselItem
              className="basis-[88%] sm:basis-[70%] lg:basis-[52%]"
              key={report.slug}
            >
              <ReportBoard active={index === selected} report={report} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="bg-background/90 left-4 hidden backdrop-blur-sm sm:inline-flex" />
        <CarouselNext className="bg-background/90 right-4 hidden backdrop-blur-sm sm:inline-flex" />
      </Carousel>
      <CarouselProgress
        activeIndex={selected}
        labels={reports.map((report) => `${report.subject} report`)}
        onSelect={(index) => api?.scrollTo(index)}
        progress={PROGRESS_FULL}
      />
    </div>
  );
}
