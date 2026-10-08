"use client";

import { CompetitorLogo } from "@notra/ui/components/geo/competitor-logo";
import { cn } from "@notra/ui/lib/utils";
import { type ReactNode, useState } from "react";

import {
  ReportPanel,
  ShellFooterButton,
} from "@/components/state-of-ai-search/report-section";
import type { StateOfAiSearchOverview } from "@/types/state-of-ai-search";

const LEAD_SEPARATOR = ": ";
const LEAD_MAX_LENGTH = 60;

function referenceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ReferenceChip({
  refs,
  overview,
}: {
  refs: number[];
  overview: StateOfAiSearchOverview;
}) {
  const references = refs.flatMap(
    (index) => overview.references.find((ref) => ref.index === index) ?? []
  );
  const [first] = references;
  if (!first) {
    return null;
  }
  const domain = referenceDomain(first.url);
  const extra = references.length - 1;
  return (
    <a
      className="border-border bg-background text-muted-foreground hover:text-foreground ml-1.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border py-0.5 pr-2 pl-1 align-middle text-[0.6875rem] font-medium whitespace-nowrap transition-colors"
      href={first.url}
      rel="noopener noreferrer nofollow"
      target="_blank"
    >
      <CompetitorLogo
        className="size-3.5 rounded-full"
        domain={domain}
        name={first.source || domain}
      />
      {first.source || domain}
      {extra > 0 ? <span className="tabular-nums">+{extra}</span> : null}
    </a>
  );
}

/** "Neon: Best for…" lists bold the lead like Google does. */
function LeadText({ text }: { text: string }) {
  const separator = text.indexOf(LEAD_SEPARATOR);
  if (separator <= 0 || separator > LEAD_MAX_LENGTH) {
    return <>{text}</>;
  }
  return (
    <>
      <strong className="text-foreground font-semibold">
        {text.slice(0, separator)}
      </strong>
      {text.slice(separator)}
    </>
  );
}

export function AiOverviewCard({
  overview,
}: {
  overview: StateOfAiSearchOverview;
}) {
  return (
    <div className="text-muted-foreground flex flex-col gap-3 p-4 text-sm/6">
      {overview.blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          return (
            <h3
              className="text-foreground pt-1 text-sm font-semibold"
              key={key}
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul
              className="marker:text-muted-foreground/60 flex list-disc flex-col gap-2 pl-5"
              key={key}
            >
              {block.items.map((item) => (
                <li key={item.text}>
                  <LeadText text={item.text} />
                  <ReferenceChip overview={overview} refs={item.refs} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={key}>
            {block.text}
            <ReferenceChip overview={overview} refs={block.refs} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * The overview at the height of its neighbour: on wide screens the text is
 * taken out of flow so the sources table sets the row height, then fades out
 * until the reader opens it.
 */
export function AiOverviewPanel({
  overview,
  header,
}: {
  overview: StateOfAiSearchOverview;
  header: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ReportPanel
      bodyClassName={cn(
        "relative overflow-hidden",
        !expanded && "max-lg:max-h-[28rem] lg:min-h-[20rem]"
      )}
      className="h-full"
      footer={
        <ShellFooterButton
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : "Show full overview"}
        </ShellFooterButton>
      }
      header={header}
    >
      <div className={cn(!expanded && "lg:absolute lg:inset-0")}>
        <AiOverviewCard overview={overview} />
      </div>
      {expanded ? null : (
        <div
          aria-hidden="true"
          className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t to-transparent"
        />
      )}
    </ReportPanel>
  );
}
