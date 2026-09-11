"use client";

import { GEO_CHAT_SKIN_SURFACE } from "@notra/geo-core/constants/geo";
import type { GeoChatSkin, GeoPromptResult } from "@notra/geo-core/types/geo";
import { perplexitySourcesFromExcerpt } from "@notra/geo-core/utils/geo-perplexity-sources";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import {
  geoAnswerEmptyClassName,
  geoAnswerMarkdownFontClass,
} from "@notra/ui/lib/geo-answer-font";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";
import type { ReactNode } from "react";

import { GeoAnswerActions } from "@/components/geo/geo-answer-actions";
import {
  GeoAnswerMentionBlockquote,
  GeoAnswerMentionHeading1,
  GeoAnswerMentionHeading2,
  GeoAnswerMentionHeading3,
  GeoAnswerMentionListItem,
  GeoAnswerMentionParagraph,
  GeoAnswerMentionTableCell,
  GeoAnswerMentionTableHeaderCell,
} from "@/components/geo/geo-answer-mention-components";
import { GeoAnswerMentionProvider } from "@/components/geo/geo-answer-mentions";
import { GeoAnswerSearch } from "@/components/geo/geo-answer-search";
import { GeoSkinMessage } from "@/components/geo/geo-skin-message";
import { useGeoAnswerMentionData } from "@/lib/hooks/use-geo-answer-mentions";
import { cn } from "@/lib/utils";
import type { GeoPromptAnswerThreadProps } from "@/types/geo";
import type { GeoAnswerMentionComponents } from "@/types/geo-answer-mentions";
import { geoChatSkin } from "@/utils/geo-chat-skin";

const ANSWER_MARKDOWN_CLASS =
  "[&_h1]:mt-0 [&_h1]:mb-2 [&_h1]:text-[1.15em] [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1.05em] [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[1em] [&_h3]:font-semibold [&_p]:my-2.5 [&_ul]:my-2.5 [&_ol]:my-2.5";

const GEO_ANSWER_MENTION_COMPONENTS: GeoAnswerMentionComponents = {
  p: GeoAnswerMentionParagraph,
  li: GeoAnswerMentionListItem,
  td: GeoAnswerMentionTableCell,
  th: GeoAnswerMentionTableHeaderCell,
  h1: GeoAnswerMentionHeading1,
  h2: GeoAnswerMentionHeading2,
  h3: GeoAnswerMentionHeading3,
  blockquote: GeoAnswerMentionBlockquote,
};

function emptyAnswerCopy(mentioned: boolean): string {
  return mentioned
    ? "Mentioned, but no answer was captured."
    : "This engine did not mention you.";
}

function displayAnswer(result: { answer: string; excerpt: string }): string {
  return result.answer.trim() || result.excerpt.trim();
}

function threadSources(
  result: GeoPromptResult,
  answer: string
): PerplexitySearchSource[] {
  if (result.sources.length > 0) {
    return result.sources.map((source) => ({
      title: source.title ?? source.domain ?? source.url,
      domain: source.domain ?? "",
      url: source.url,
      verified: true,
    }));
  }

  return perplexitySourcesFromExcerpt(answer);
}

export function AnswerMarkdown({
  text,
  skin,
  mode = "static",
}: {
  text: string;
  skin: GeoChatSkin;
  mode?: "static" | "streaming";
}) {
  return (
    <MessageResponse
      className={cn(ANSWER_MARKDOWN_CLASS, geoAnswerMarkdownFontClass(skin))}
      components={GEO_ANSWER_MENTION_COMPONENTS}
      mode={mode}
    >
      {text}
    </MessageResponse>
  );
}

function AssistantBody({
  answer,
  mentioned,
  mode = "static",
  skin,
}: {
  answer: string;
  mentioned: boolean;
  mode?: "static" | "streaming";
  skin: GeoChatSkin;
}) {
  if (answer.length > 0) {
    return <AnswerMarkdown mode={mode} skin={skin} text={answer} />;
  }

  return (
    <p className={cn("text-muted-foreground", geoAnswerEmptyClassName(skin))}>
      {emptyAnswerCopy(mentioned)}
    </p>
  );
}

function assistantActions(
  answer: string,
  sources: readonly PerplexitySearchSource[]
) {
  if (answer.length === 0) {
    return undefined;
  }
  return (
    <GeoAnswerActions
      sources={sources.flatMap((source) =>
        source.url
          ? [{ title: source.title, url: source.url, domain: source.domain }]
          : []
      )}
      text={answer}
    />
  );
}

function ThreadMessages({
  prompt,
  answer,
  mentioned,
  skin,
  search,
  sources,
}: {
  prompt: string;
  answer: string;
  mentioned: boolean;
  skin: GeoChatSkin;
  search: ReactNode;
  sources: PerplexitySearchSource[];
}) {
  return (
    <>
      <GeoSkinMessage from="user" skin={skin}>
        {prompt}
      </GeoSkinMessage>
      <GeoSkinMessage
        actions={assistantActions(answer, sources)}
        from="assistant"
        search={search}
        skin={skin}
      >
        <AssistantBody answer={answer} mentioned={mentioned} skin={skin} />
      </GeoSkinMessage>
    </>
  );
}

export function GeoPromptAnswerThread({
  scrollable = true,
  organizationId,
  prompt,
  result,
}: GeoPromptAnswerThreadProps) {
  const skin = geoChatSkin(result.engine);
  const answer = displayAnswer(result);
  const { terms: mentionTerms, competitors } = useGeoAnswerMentionData(
    organizationId,
    result.competitors
  );
  const sources = threadSources(result, answer);
  const searchQueries =
    result.searchQueries.length > 0 || skin !== "opencode"
      ? result.searchQueries
      : [prompt];
  const hasRecordedSearch =
    searchQueries.length > 0 || result.sources.length > 0;
  const search = hasRecordedSearch ? (
    <GeoAnswerSearch queries={searchQueries} skin={skin} sources={sources} />
  ) : undefined;

  return (
    <GeoAnswerMentionProvider
      competitors={competitors}
      organizationId={organizationId}
      terms={mentionTerms}
    >
      <div
        className={cn(
          scrollable
            ? "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            : "relative flex min-h-full flex-1 flex-col",
          GEO_CHAT_SKIN_SURFACE[skin]
        )}
      >
        <div
          className={
            scrollable
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : undefined
          }
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-8">
            <ThreadMessages
              answer={answer}
              mentioned={result.mentioned}
              prompt={prompt}
              search={search}
              skin={skin}
              sources={sources}
            />
          </div>
        </div>
      </div>
    </GeoAnswerMentionProvider>
  );
}
