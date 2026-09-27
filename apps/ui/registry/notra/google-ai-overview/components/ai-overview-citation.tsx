import { cn } from "cn";

import { badgeVariants } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";

import type {
  AIOverviewCitationProps,
  AIOverviewSource,
} from "../types/google-ai-overview";
import { AIOverviewFavicon } from "./ai-overview-favicon";

const sourceLabel = (source: AIOverviewSource) =>
  source.meta ? `${source.siteName} · ${source.meta}` : source.siteName;

export const AIOverviewCitation = ({
  className,
  preview = true,
  rel = "noopener",
  renderSourceAction,
  sources,
  target = "_blank",
  ...props
}: AIOverviewCitationProps) => {
  const [source] = sources;
  const label = sourceLabel(source);
  const extra = sources.length - 1;
  const chipClassName = cn(
    badgeVariants({ variant: "secondary" }),
    "bg-aio-chip text-aio-muted focus-visible:outline-aio-focus [a]:hover:bg-aio-chip-hover max-w-[10.9375rem] justify-start rounded-full border-0 py-px ps-px pe-2 align-text-top text-[0.6875rem] leading-4 focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid",
    className
  );
  const chip = (
    <>
      <AIOverviewFavicon name={source.siteName} src={source.favicon} />
      <span className="truncate">{label}</span>
      {extra > 0 && <span className="-ms-1 shrink-0">&nbsp;+{extra}</span>}
    </>
  );
  const ariaLabel = extra > 0 ? `${label} (+${extra})` : label;

  return (
    <span className="whitespace-nowrap" data-slot="ai-overview-citation">
      <span aria-hidden="true">&nbsp;</span>
      {preview ? (
        <HoverCard>
          <HoverCardTrigger
            aria-label={ariaLabel}
            className={chipClassName}
            href={source.href}
            rel={rel}
            target={target}
            {...props}
          >
            {chip}
          </HoverCardTrigger>
          <HoverCardContent
            align="start"
            alignOffset={-10}
            className="bg-aio-popover font-aio text-aio-popover-fg max-h-72.5 w-90 overflow-y-auto rounded-[1.25rem] p-0 antialiased shadow-[0_1px_2px_0_rgb(0_0_0/0.3),0_2px_6px_2px_rgb(0_0_0/0.15)] ring-0"
            sideOffset={8}
          >
            <ul>
              {sources.map((item, index) => (
                <li
                  className="after:bg-aio-border relative after:absolute after:inset-x-4 after:bottom-0 after:h-px last:after:hidden"
                  key={item.href}
                >
                  {index > 0 && (
                    <Separator className="bg-aio-border mx-4 data-horizontal:w-auto" />
                  )}
                  <a
                    aria-label={item.title ?? item.siteName}
                    className="focus-visible:outline-aio-focus absolute inset-0.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-solid"
                    href={item.href}
                    rel={rel}
                    target={target}
                  />
                  <div className="pointer-events-none flex flex-col gap-2 p-3">
                    <div className="text-aio-popover-muted flex h-4.5 min-w-0 items-center pe-6 text-xs leading-4">
                      <AIOverviewFavicon
                        name={item.siteName}
                        src={item.favicon}
                      />
                      <span className="ms-[0.3125rem] truncate">
                        {item.siteName}
                      </span>
                      {item.meta && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="truncate text-[0.6875rem]">
                            {item.meta}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-1 pe-3">
                        <span className="line-clamp-2 text-sm leading-4.5 font-medium">
                          {item.title ?? item.siteName}
                        </span>
                        {item.description && (
                          <span className="text-aio-popover-muted line-clamp-2 text-xs leading-4">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {item.thumbnail && (
                        <img
                          alt=""
                          className="size-17 shrink-0 rounded-lg object-cover"
                          src={item.thumbnail}
                        />
                      )}
                    </div>
                  </div>
                  {renderSourceAction && (
                    <div className="absolute end-0.75 top-0.75">
                      {renderSourceAction(item)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <a
          aria-label={ariaLabel}
          className={chipClassName}
          href={source.href}
          rel={rel}
          target={target}
          {...props}
        >
          {chip}
        </a>
      )}
    </span>
  );
};
