"use client";

import { Cancel01Icon, GlobalIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatgptSearch } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-search";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@notra/ui/components/ui/sheet";
import { Button } from "@notra/ui/components/ui/button";
import { AI_SKIN_BUTTON_RESET } from "@notra/ui/constants/ai-skin-primitives";
import { cn } from "@notra/ui/lib/utils";
import { isReservedExampleDomain } from "@notra/utils/google-favicon";
import { Image } from "@notra/ui/components/framework-provider";
import { useState } from "react";

export interface ChatgptActivitySite {
  domain: string;
  label: string;
}

export interface ChatgptActivitySource {
  id: string;
  publisher: string;
  domain: string;
  title: string;
  snippet: string;
  timeLabel: string;
}

function faviconSrc(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function SiteFavicon({
  domain,
  className,
}: {
  domain: string;
  className?: string;
}) {
  // Reserved `.example` domains (demo data) never have a favicon.
  const [failed, setFailed] = useState(() => isReservedExampleDomain(domain));

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn("inline-block rounded-full bg-muted", className)}
      />
    );
  }

  return (
    <Image
      alt=""
      className={cn("rounded-full bg-muted", className)}
      height={64}
      onError={() => setFailed(true)}
      src={faviconSrc(domain)}
      unoptimized
      width={64}
    />
  );
}

function WebsitePills({ sites }: { sites: ChatgptActivitySite[] }) {
  const visible = sites.slice(0, 3);
  const rest = sites.slice(3);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((site) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[12px] leading-none text-foreground"
          key={site.domain}
        >
          <SiteFavicon className="size-3.5" domain={site.domain} />
          {site.label}
        </span>
      ))}
      {rest.length > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[12px] leading-none text-foreground">
          <span className="flex -space-x-1.5">
            {rest.map((site) => (
              <SiteFavicon
                className="size-3.5 ring-1 ring-background"
                domain={site.domain}
                key={site.domain}
              />
            ))}
          </span>
          + {rest.length} more
        </span>
      ) : null}
    </div>
  );
}

export function ChatgptActivity({
  websites,
  seconds,
  sites,
  sources,
  sourceCount,
  className,
}: {
  websites: number;
  seconds: number;
  sites: ChatgptActivitySite[];
  sources: ChatgptActivitySource[];
  sourceCount?: number;
  className?: string;
}) {
  const sourcesLabel = sourceCount ?? sources.length;

  return (
    <Sheet>
      <SheetTrigger
        className={className}
        render={<ChatgptSearch websites={websites} />}
      />
      <SheetContent
        className="w-full gap-0 p-0 sm:max-w-[26rem]"
        showCloseButton={false}
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 px-5 py-4">
          <SheetTitle className="flex items-baseline gap-1.5 text-[16px] font-semibold">
            Activity
            <span className="font-normal text-muted-foreground">
              · {seconds}s
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Search activity and sources
          </SheetDescription>
          <SheetClose
            render={
              <Button
                aria-label="Close"
                className={cn(
                  AI_SKIN_BUTTON_RESET,
                  "rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted"
                )}
                size="icon"
                type="button"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <section className="space-y-4">
            <h3 className="font-semibold text-[15px] text-foreground">
              Thinking
            </h3>
            <div className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 gap-y-5">
              <span
                aria-hidden
                className="absolute top-4 bottom-8 left-[0.4375rem] w-px bg-border"
              />
              <HugeiconsIcon
                className="relative mt-0.5 text-muted-foreground"
                icon={GlobalIcon}
                size={16}
                strokeWidth={1.75}
              />
              <div className="space-y-2.5">
                <p className="text-[14px] leading-5 text-foreground">
                  Searching {websites} websites
                </p>
                <WebsitePills sites={sites} />
              </div>
              <HugeiconsIcon
                className="relative mt-0.5 text-muted-foreground"
                icon={Tick02Icon}
                size={16}
                strokeWidth={2}
              />
              <div className="space-y-0.5">
                <p className="text-[14px] leading-5 text-foreground">
                  Worked for {seconds}s
                </p>
                <p className="text-[13px] leading-5 text-muted-foreground">
                  Done
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-4">
            <h3 className="font-semibold text-[15px] text-foreground">
              Sources
              <span className="font-normal text-muted-foreground">
                {" "}
                · {sourcesLabel}
              </span>
            </h3>
            <ul className="space-y-5">
              {sources.map((source) => (
                <li className="flex gap-2.5" key={source.id}>
                  <SiteFavicon
                    className="mt-0.5 size-4 shrink-0"
                    domain={source.domain}
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-[12px] leading-4 text-muted-foreground">
                      {source.publisher}
                    </p>
                    <p className="text-[14px] font-semibold leading-5 text-foreground">
                      {source.title}
                    </p>
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      {source.timeLabel} — {source.snippet}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
