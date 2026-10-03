"use client";

import {
  ArrowRight01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  DashedLineCircleIcon,
  Loading03Icon,
  MinusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { SiteDeploymentStepState } from "@/types/sites";

const STEP_ICONS: Record<SiteDeploymentStepState, IconSvgElement> = {
  pending: DashedLineCircleIcon,
  active: Loading03Icon,
  done: CheckmarkCircle02Icon,
  failed: CancelCircleIcon,
  skipped: MinusSignCircleIcon,
};

/** Status color lives on the icon only: amber running, green done, red failed. */
const STEP_ICON_STYLES: Record<SiteDeploymentStepState, string> = {
  pending: "text-muted-foreground/50",
  active: "text-warning motion-safe:animate-spin",
  done: "text-success",
  failed: "text-destructive",
  skipped: "text-muted-foreground/50",
};

const COLLAPSIBLE_PANEL =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none";

export function SiteDeploymentTimeline({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ol aria-label={label} className="min-w-0">
      {children}
    </ol>
  );
}

/**
 * One step of a deployment: an icon on a rail, its label, a quiet note and
 * its time on the right. Content (the build log, the live site) hangs under
 * the label; a step with `collapsible` folds it behind the header.
 */
export function SiteDeploymentTimelineStep({
  state,
  label,
  note,
  time,
  last = false,
  collapsible,
  children,
}: {
  state: SiteDeploymentStepState;
  label: string;
  /** Muted text after the label, e.g. "Waiting for a builder". */
  note?: ReactNode;
  /** How long the step took, or when it happened. */
  time?: ReactNode;
  last?: boolean;
  collapsible?: { open: boolean; onOpenChange: (open: boolean) => void };
  children?: ReactNode;
}) {
  const quiet = state === "pending" || state === "skipped";
  const header = (
    <>
      {state === "active" ? (
        <Shimmer as="span" className="shrink-0 font-medium">
          {label}
        </Shimmer>
      ) : (
        <span
          className={cn(
            "shrink-0 font-medium",
            quiet && "text-muted-foreground"
          )}
        >
          {label}
        </span>
      )}
      {time ? (
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {time}
        </span>
      ) : null}
      {note ? (
        <span className="text-muted-foreground min-w-0 truncate">
          {time ? <span aria-hidden="true">· </span> : null}
          {note}
        </span>
      ) : null}
      {collapsible ? (
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 ease-out group-data-[panel-open]/step:rotate-90 motion-reduce:transition-none"
          icon={ArrowRight01Icon}
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );

  const body = children ? <div className="pt-3 pb-1">{children}</div> : null;

  return (
    <li
      aria-current={state === "active" ? "step" : undefined}
      className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3"
    >
      <span className="relative flex justify-center" aria-hidden="true">
        <HugeiconsIcon
          className={cn(
            "relative z-10 mt-0.5 size-5 shrink-0 transition-colors duration-300",
            STEP_ICON_STYLES[state]
          )}
          icon={STEP_ICONS[state]}
          strokeWidth={1.5}
        />
        {last ? null : (
          <span className="bg-border absolute top-7 bottom-1 w-px" />
        )}
      </span>
      <div className={cn("min-w-0 text-sm", last ? "pb-0" : "pb-7")}>
        {collapsible ? (
          <Collapsible
            onOpenChange={collapsible.onOpenChange}
            open={collapsible.open}
          >
            <CollapsibleTrigger
              render={
                <button
                  className="group/step hover:text-foreground focus-visible:ring-ring/50 -mx-2 flex h-6 w-fit max-w-[calc(100%+1rem)] min-w-0 items-center gap-2 rounded-md px-2 text-left outline-none focus-visible:ring-2"
                  type="button"
                />
              }
            >
              {header}
            </CollapsibleTrigger>
            <CollapsibleContent render={<div className={COLLAPSIBLE_PANEL} />}>
              {body}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <>
            <div className="flex h-6 min-w-0 items-center gap-2">{header}</div>
            {body}
          </>
        )}
      </div>
    </li>
  );
}
