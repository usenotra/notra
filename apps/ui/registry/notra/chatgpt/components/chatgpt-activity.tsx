"use client";

import { cn } from "cn";
import { CheckIcon, GlobeIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { CHATGPT_VISIBLE_SITES } from "../constants/chatgpt";
import type {
  ChatgptActivityProps,
  ChatgptActivitySite,
} from "../types/chatgpt";
import { ChatgptFavicon } from "./chatgpt-favicon";
import { ChatgptSearch } from "./chatgpt-search";

const stepClassName =
  "relative flex-nowrap items-start gap-3 rounded-none border-0 p-0";

const sourceClassName =
  "flex-nowrap items-start gap-2.5 rounded-lg border-0 p-0 text-sm";

const pillClassName =
  "border-chatgpt-border bg-chatgpt-bg text-chatgpt-fg h-auto gap-1.5 rounded-full px-2 py-1 text-xs leading-none font-normal";

const ChatgptWebsitePills = ({ sites }: { sites: ChatgptActivitySite[] }) => {
  const visible = sites.slice(0, CHATGPT_VISIBLE_SITES);
  const rest = sites.slice(CHATGPT_VISIBLE_SITES);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((site) => (
        <Badge className={pillClassName} key={site.domain} variant="outline">
          <ChatgptFavicon
            className="size-3.5"
            domain={site.domain}
            src={site.favicon}
          />
          {site.label}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Badge className={pillClassName} variant="outline">
          <span className="flex -space-x-1.5">
            {rest.map((site) => (
              <ChatgptFavicon
                className="ring-chatgpt-bg size-3.5 ring-1"
                domain={site.domain}
                key={site.domain}
                src={site.favicon}
              />
            ))}
          </span>
          {`+ ${rest.length} more`}
        </Badge>
      )}
    </div>
  );
};

export const ChatgptActivity = ({
  className,
  seconds,
  sites,
  sourceCount,
  sources,
  websites,
  ...props
}: ChatgptActivityProps) => (
  // trap-focus keeps focus inside without locking page scroll, so the page
  // behind the sheet does not jump when the scrollbar disappears.
  <Sheet modal="trap-focus" {...props}>
    <SheetTrigger
      className={className}
      render={<ChatgptSearch sites={sites} websites={websites} />}
    />
    <SheetContent
      className="bg-chatgpt-bg font-chatgpt text-chatgpt-fg data-[side=right]:border-chatgpt-border w-full gap-0 p-0 data-[side=right]:sm:max-w-104"
      data-slot="chatgpt-activity"
      showCloseButton={false}
    >
      <SheetHeader className="flex-row items-center justify-between px-5 py-4">
        <SheetTitle className="text-chatgpt-fg flex items-baseline gap-1.5 text-base font-semibold">
          Activity
          <span className="text-chatgpt-muted font-normal">· {seconds}s</span>
        </SheetTitle>
        <SheetDescription className="sr-only">
          Search activity and sources
        </SheetDescription>
        <SheetClose
          render={
            <Button
              aria-label="Close"
              className="text-chatgpt-muted hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-hover rounded-full border-0 focus-visible:ring-2"
              size="icon"
              variant="ghost"
            />
          }
        >
          <XIcon className="size-4" />
        </SheetClose>
      </SheetHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 pb-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-chatgpt-fg text-[0.9375rem] font-semibold">
              Thinking
            </h3>
            <div className="relative">
              <Separator
                className="bg-chatgpt-border absolute top-4 bottom-8 left-1.75"
                orientation="vertical"
              />
              <ItemGroup className="gap-5">
                <Item className={stepClassName} role="listitem">
                  <ItemMedia className="text-chatgpt-muted relative mt-0.5 w-4 translate-y-0">
                    <GlobeIcon className="size-4" strokeWidth={1.75} />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-2.5">
                    <ItemTitle className="text-chatgpt-fg line-clamp-none w-auto text-sm leading-5 font-normal">
                      {`Searching ${websites} websites`}
                    </ItemTitle>
                    <ChatgptWebsitePills sites={sites} />
                  </ItemContent>
                </Item>
                <Item className={stepClassName} role="listitem">
                  <ItemMedia className="text-chatgpt-muted relative mt-0.5 w-4 translate-y-0">
                    <CheckIcon className="size-4" strokeWidth={2} />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle className="text-chatgpt-fg line-clamp-none w-auto text-sm leading-5 font-normal">
                      {`Worked for ${seconds}s`}
                    </ItemTitle>
                    <ItemDescription className="text-chatgpt-muted text-[0.8125rem] leading-5">
                      Done
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </ItemGroup>
            </div>
          </section>

          <section className="mt-8 flex flex-col gap-4">
            <h3 className="text-chatgpt-fg text-[0.9375rem] font-semibold">
              Sources
              <span className="text-chatgpt-muted font-normal">
                {` · ${sourceCount ?? sources.length}`}
              </span>
            </h3>
            <ItemGroup className="gap-5">
              {sources.map((source) => (
                <Item
                  className={cn(
                    sourceClassName,
                    source.href &&
                      "focus-visible:ring-chatgpt-focus/35 [a]:hover:bg-chatgpt-hover -m-1.5 p-1.5 focus-visible:ring-2 motion-reduce:transition-none"
                  )}
                  key={source.id}
                  render={
                    source.href
                      ? (linkProps) => (
                          <a
                            {...linkProps}
                            href={source.href}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {linkProps.children}
                          </a>
                        )
                      : undefined
                  }
                  role="listitem"
                >
                  <ItemMedia className="mt-0.5 translate-y-0">
                    <ChatgptFavicon
                      className="size-4"
                      domain={source.domain}
                      src={source.favicon}
                    />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-1">
                    <p className="text-chatgpt-muted text-xs leading-4">
                      {source.publisher}
                    </p>
                    <ItemTitle className="text-chatgpt-fg line-clamp-none w-auto text-sm leading-5 font-semibold">
                      {source.title}
                    </ItemTitle>
                    <ItemDescription className="text-chatgpt-muted line-clamp-none text-[0.8125rem] leading-5">
                      {`${source.timeLabel} — ${source.snippet}`}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);
