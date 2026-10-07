export const CLAUDE_CHAT_SEARCH_VERB_HOLD_MS = 1100;
export const CLAUDE_CHAT_SEARCH_QUERY_MS = 420;
export const CLAUDE_CHAT_SEARCH_RESULTS_MS = 640;
export const CLAUDE_CHAT_SEARCH_STEP_MS = 380;
export const CLAUDE_CHAT_SEARCH_STAGGER_MS = 50;

export function claudeChatSearchDuration(
  groupCount: number,
  stepCount: number,
  reducedMotion: boolean
) {
  if (reducedMotion) {
    return 0;
  }
  return (
    CLAUDE_CHAT_SEARCH_VERB_HOLD_MS +
    groupCount * (CLAUDE_CHAT_SEARCH_QUERY_MS + CLAUDE_CHAT_SEARCH_RESULTS_MS) +
    stepCount * CLAUDE_CHAT_SEARCH_STEP_MS
  );
}
