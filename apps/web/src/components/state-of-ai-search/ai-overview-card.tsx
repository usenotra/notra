"use client";

import { AIOverview } from "@notra/ui/components/ai-skins/google-ai-overview/ai-overview";
import { AIOverviewCitation } from "@notra/ui/components/ai-skins/google-ai-overview/ai-overview-citation";
import {
  AIOverviewContent,
  AIOverviewHeading,
  AIOverviewList,
  AIOverviewListItem,
  AIOverviewParagraph,
} from "@notra/ui/components/ai-skins/google-ai-overview/ai-overview-content";
import { AIOverviewHeader } from "@notra/ui/components/ai-skins/google-ai-overview/ai-overview-header";
import { cn } from "@notra/ui/lib/utils";
import type { AIOverviewSource } from "@notra/ui/types/google-ai-overview";
import { googleFaviconUrl } from "@notra/utils/google-favicon";
import type { ReactNode } from "react";

import { ReportPanel } from "@/components/state-of-ai-search/report-section";
import type { StateOfAiSearchOverview } from "@/types/state-of-ai-search";
import { uniqueKeys } from "@/utils/unique-keys";

const LEAD_SEPARATOR = ": ";
const LEAD_MAX_LENGTH = 60;

function referenceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Citation({
  refs,
  overview,
}: {
  refs: number[];
  overview: StateOfAiSearchOverview;
}) {
  const sources = refs.flatMap((index): AIOverviewSource[] => {
    const reference = overview.references.find((ref) => ref.index === index);
    if (!reference) {
      return [];
    }
    const domain = referenceDomain(reference.url);
    return [
      {
        href: reference.url,
        siteName: reference.source || domain,
        title: reference.title || undefined,
        favicon: googleFaviconUrl(domain) ?? "",
      },
    ];
  });
  const [first, ...rest] = sources;
  return first ? <AIOverviewCitation sources={[first, ...rest]} /> : null;
}

/** "Neon: Best for…" lists bold the lead like Google does. */
function LeadText({ text }: { text: string }) {
  const separator = text.indexOf(LEAD_SEPARATOR);
  if (separator <= 0 || separator > LEAD_MAX_LENGTH) {
    return <>{text}</>;
  }
  return (
    <>
      <strong>{text.slice(0, separator)}</strong>
      {text.slice(separator)}
    </>
  );
}

/** Google's AI Overview in the AI Overview skin from @notra/ui. */
export function GoogleAiOverview({
  overview,
  className,
}: {
  overview: StateOfAiSearchOverview;
  className?: string;
}) {
  // Blocks have no ids and headings such as "Pros" repeat.
  const blockKeys = uniqueKeys(
    overview.blocks.map(
      (block) =>
        `${block.type}-${block.type === "list" ? block.items[0]?.text : block.text}`
    )
  );
  return (
    <AIOverview className={cn("p-5", className)} collapsible={false}>
      <AIOverviewHeader />
      <AIOverviewContent>
        {overview.blocks.map((block, index) => {
          const key = blockKeys[index];
          if (block.type === "heading") {
            return (
              <AIOverviewHeading key={key}>{block.text}</AIOverviewHeading>
            );
          }
          if (block.type === "list") {
            return (
              <AIOverviewList key={key}>
                {block.items.map((item) => (
                  <AIOverviewListItem key={item.text}>
                    <LeadText text={item.text} />
                    <Citation overview={overview} refs={item.refs} />
                  </AIOverviewListItem>
                ))}
              </AIOverviewList>
            );
          }
          return (
            <AIOverviewParagraph key={key}>
              {block.text}
              <Citation overview={overview} refs={block.refs} />
            </AIOverviewParagraph>
          );
        })}
      </AIOverviewContent>
    </AIOverview>
  );
}

/**
 * The overview at the height of its neighbour: on wide screens the text is
 * taken out of flow so the sources table sets the row height, and the reader
 * scrolls inside the panel.
 */
export function AiOverviewPanel({
  overview,
  header,
}: {
  overview: StateOfAiSearchOverview;
  header: ReactNode;
}) {
  return (
    <ReportPanel
      bodyClassName="bg-aio-bg relative max-lg:max-h-[32rem] max-lg:overflow-y-auto lg:min-h-[20rem]"
      className="h-full"
      header={header}
    >
      <div
        className="overscroll-contain lg:absolute lg:inset-0 lg:overflow-y-auto"
        aria-label="AI Overview text"
        role="region"
        // Keyboard users need to reach the text that scrolls.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        <GoogleAiOverview className="rounded-[14px]" overview={overview} />
      </div>
    </ReportPanel>
  );
}
