"use client";

import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";

import { useScheduleDestinationName } from "@/lib/hooks/use-schedule-destination-name";
import type { ScheduleDestinationMarkProps } from "@/types/content/schedule";

const MARK_CLASS = "size-4 shrink-0";

function DestinationIcon({
  destination,
  socialPlatform,
}: ScheduleDestinationMarkProps) {
  if (destination === "notra") {
    // The mark carries its own label; the name beside it already says it.
    return (
      <span aria-hidden className="contents">
        <Notra className={MARK_CLASS} />
      </span>
    );
  }
  if (destination === "github") {
    return <Github aria-hidden className={MARK_CLASS} />;
  }
  if (socialPlatform === "linkedin") {
    return <Linkedin aria-hidden className={MARK_CLASS} />;
  }
  return <XTwitter aria-hidden className={MARK_CLASS} />;
}

/** A destination's brand mark and name, e.g. GitHub or X. */
export function ScheduleDestinationMark(props: ScheduleDestinationMarkProps) {
  const destinationName = useScheduleDestinationName();
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
      <DestinationIcon {...props} />
      <span className="truncate">{destinationName(props)}</span>
    </span>
  );
}
