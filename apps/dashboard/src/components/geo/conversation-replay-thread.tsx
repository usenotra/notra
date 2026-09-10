"use client";

import { GEO_CHAT_SKIN_SURFACE } from "@notra/geo-core/constants/geo";
import type {
  GeoChatSkin,
  GeoSequenceTurnResult,
} from "@notra/geo-core/types/geo";
import { perplexitySourcesFromStoredOrExcerpt } from "@notra/geo-core/utils/geo-perplexity-sources";
import { geoAnswerThinkingClassName } from "@notra/ui/lib/geo-answer-font";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";

import { GeoAnswerSearch } from "@/components/geo/geo-answer-search";
import { AnswerMarkdown } from "@/components/geo/geo-prompt-answer-thread";
import { GeoSkinMessage } from "@/components/geo/geo-skin-message";
import { cn } from "@/lib/utils";
import type {
  AnswerReplayProgress,
  ConversationReplayThreadProps,
} from "@/types/geo";
import {
  answerReplayState,
  conversationReplaySearch,
} from "@/utils/geo-answer-replay";
import { geoChatSkin } from "@/utils/geo-chat-skin";

function replaySources(turn: GeoSequenceTurnResult): PerplexitySearchSource[] {
  return perplexitySourcesFromStoredOrExcerpt(turn.sources, turn.answer);
}

function ThinkingIndicator({ skin }: { skin: GeoChatSkin }) {
  return (
    <p
      className={cn(
        "text-muted-foreground animate-pulse",
        geoAnswerThinkingClassName(skin)
      )}
    >
      Thinking…
    </p>
  );
}

function SourcePills({ sources }: { sources: PerplexitySearchSource[] }) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {sources.map((source) => (
        <a
          className="border-border text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-xs transition-colors"
          href={source.url}
          key={source.url ?? source.domain}
          rel="noopener noreferrer"
          target="_blank"
        >
          {source.domain}
        </a>
      ))}
    </div>
  );
}

function MentionPill({ turn }: { turn: GeoSequenceTurnResult }) {
  return (
    <p className="pt-1 text-xs">
      {turn.mentioned ? (
        <span className="text-geo-up font-medium">
          {turn.position !== null
            ? `Mentioned at #${turn.position}`
            : "Mentioned"}
        </span>
      ) : (
        <span className="text-muted-foreground">Not mentioned</span>
      )}
    </p>
  );
}

function ReplayTurn({
  turn,
  skin,
  progress,
  index,
}: {
  turn: GeoSequenceTurnResult;
  skin: GeoChatSkin;
  progress: AnswerReplayProgress | null;
  index: number;
}) {
  const isReplaying = progress !== null;
  if (isReplaying && index > progress.index) {
    return null;
  }

  const isCurrent = isReplaying && index === progress.index;
  const sources = replaySources(turn);
  const search = conversationReplaySearch(turn, skin);
  const { answerDone, showThinking, showAssistant, showSearch, answerText } =
    answerReplayState(
      turn.answer,
      isCurrent ? progress : null,
      skin,
      search.hasSearch
    );

  return (
    <>
      <GeoSkinMessage from="user" skin={skin}>
        {turn.prompt}
      </GeoSkinMessage>
      {showAssistant && (
        <GeoSkinMessage
          from="assistant"
          search={
            showSearch ? (
              <GeoAnswerSearch
                queries={search.queries}
                sequential={isCurrent}
                skin={skin}
                sources={sources}
              />
            ) : undefined
          }
          skin={skin}
        >
          {showThinking ? (
            <ThinkingIndicator skin={skin} />
          ) : (
            <>
              <AnswerMarkdown
                mode={answerDone ? "static" : "streaming"}
                skin={skin}
                text={answerText}
              />
              {answerDone && !showSearch && <SourcePills sources={sources} />}
              {answerDone && <MentionPill turn={turn} />}
            </>
          )}
        </GeoSkinMessage>
      )}
    </>
  );
}

export function ConversationReplayThread({
  engine,
  turns,
  progress,
}: ConversationReplayThreadProps) {
  const skin = geoChatSkin(engine);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        GEO_CHAT_SKIN_SURFACE[skin]
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-8">
          {turns.map((turn, index) => (
            <ReplayTurn
              index={index}
              key={turn.turn}
              progress={progress}
              skin={skin}
              turn={turn}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
