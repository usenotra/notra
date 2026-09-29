"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";

import type { AIOverviewProps } from "../types/google-ai-overview";
import { AIOverviewChevronIcon } from "./ai-overview-icons";

export const AIOverview = ({
  children,
  className,
  collapsible = true,
  open,
  render = <section />,
  showMoreLabel = "Show more",
  ...props
}: AIOverviewProps) => (
  <Collapsible
    className={cn(
      "group/ai-overview bg-aio-bg font-aio text-aio-fg relative text-base leading-6 font-normal antialiased",
      collapsible &&
        "data-closed:max-h-[var(--aio-collapsed-height,36.4375rem)] data-closed:overflow-y-clip",
      className
    )}
    data-slot="ai-overview"
    open={collapsible ? open : true}
    render={render}
    {...props}
  >
    {children}
    {collapsible && (
      <>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-2 h-37 bg-[linear-gradient(transparent_0,color-mix(in_srgb,var(--aio-bg)_90%,transparent)_3.25rem,var(--aio-bg)_5rem)] group-data-open/ai-overview:hidden"
        />
        <div className="bg-aio-bg absolute inset-x-0 bottom-5 z-2 pb-0.5 group-data-open/ai-overview:hidden">
          <CollapsibleTrigger
            render={
              <Button
                className="border-aio-button-border text-aio-button-fg hover:bg-aio-button-icon/[8.24%] hover:text-aio-button-fg focus-visible:border-aio-button-border focus-visible:outline-aio-focus active:bg-aio-button-icon/[22.4%] dark:border-aio-button-border dark:hover:bg-aio-button-icon/[8.24%] dark:active:bg-aio-button-icon/[22.4%] h-12.5 w-full max-w-177 gap-0 rounded-full bg-transparent px-[0.9375rem] py-[0.6875rem] text-sm leading-5 font-medium shadow-none transition-none [corner-shape:round] focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-0 supports-[corner-shape:squircle]:rounded-full dark:bg-transparent"
                variant="outline"
              />
            }
          >
            {showMoreLabel}
            <AIOverviewChevronIcon className="text-aio-button-icon ml-2 size-5" />
          </CollapsibleTrigger>
        </div>
      </>
    )}
  </Collapsible>
);
