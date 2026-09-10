import type {
  GeoChatSkin,
  GeoSequenceTurnResult,
} from "@notra/geo-core/types/geo";

import type { AnswerReplayProgress } from "@/types/geo";

function isTerminalChatSkin(skin: GeoChatSkin) {
  return skin === "opencode" || skin === "claude-code" || skin === "codex";
}

export function answerReplayState(
  answer: string,
  progress: AnswerReplayProgress | null,
  skin: GeoChatSkin,
  hasSearch: boolean
) {
  const stage = progress?.stage ?? null;
  const answerDone = progress === null;
  const showThinking = stage === "thinking";
  const showAnswer = answerDone || stage === "typing";

  return {
    answerDone,
    showThinking,
    showAssistant: showThinking || showAnswer,
    showSearch:
      hasSearch && (showAnswer || (isTerminalChatSkin(skin) && showThinking)),
    answerText: progress?.stage === "typing" ? progress.typed : answer,
  };
}

export function conversationReplaySearch(
  turn: GeoSequenceTurnResult,
  skin: GeoChatSkin
) {
  const needsSearchChrome = skin === "perplexity" || isTerminalChatSkin(skin);
  const hasRecordedSearch =
    turn.searchQueries.length > 0 || turn.sources.length > 0;

  return {
    hasSearch: needsSearchChrome || hasRecordedSearch,
    queries:
      turn.searchQueries.length === 0 && needsSearchChrome
        ? [turn.prompt]
        : turn.searchQueries,
  };
}
