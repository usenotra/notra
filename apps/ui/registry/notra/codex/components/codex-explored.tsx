"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { CODEX_ROW_CLASS } from "../constants/codex";
import type { CodexExploredItem, CodexExploredProps } from "../types/codex";

const CodexExploredLine = ({
  first,
  item,
}: {
  first: boolean;
  item: CodexExploredItem;
}) => (
  <li className="contents">
    <span aria-hidden="true" className="text-codex-muted">
      {first ? "└" : ""}
    </span>
    <span className="min-w-0 truncate">
      <span className="text-codex-blue">{item.verb}</span> {item.target}
      {item.scope && (
        <>
          <span className="text-codex-muted"> in </span>
          {item.scope}
        </>
      )}
    </span>
  </li>
);

export const CodexExplored = ({
  active = false,
  className,
  details = [],
  items,
  ...props
}: CodexExploredProps) => (
  <Collapsible
    className={cn(CODEX_ROW_CLASS, "text-codex-fg", className)}
    data-slot="codex-explored"
    {...props}
  >
    <span
      aria-hidden="true"
      className={cn(
        "text-codex-muted",
        active && "animate-pulse motion-reduce:animate-none"
      )}
    >
      •
    </span>
    <p className="font-bold">{active ? "Exploring" : "Explored"}</p>
    <ul className="col-start-2 grid min-w-0 grid-cols-[2ch_minmax(0,1fr)]">
      {items.map((item, index) => (
        <CodexExploredLine first={index === 0} item={item} key={item.id} />
      ))}
    </ul>
    {details.length > 0 && (
      <>
        <CollapsibleContent className="col-start-2 min-w-0">
          <ul className="grid grid-cols-[2ch_minmax(0,1fr)]">
            {details.map((item) => (
              <CodexExploredLine first={false} item={item} key={item.id} />
            ))}
          </ul>
        </CollapsibleContent>
        <CollapsibleTrigger
          className="col-start-2 ms-[2ch] justify-self-start"
          render={
            <Button
              className="text-codex-muted hover:text-codex-fg aria-expanded:text-codex-fg focus-visible:ring-codex-blue/60 h-auto rounded-xs p-0 text-start font-[inherit] text-[length:inherit] leading-[inherit] font-normal whitespace-normal hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
              variant="ghost"
            />
          }
        >
          <span className="in-data-panel-open:hidden">+ Show details</span>
          <span className="hidden in-data-panel-open:inline">
            − Hide details
          </span>
        </CollapsibleTrigger>
      </>
    )}
  </Collapsible>
);
