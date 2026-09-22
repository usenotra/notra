export const ASSISTANT_MODEL_ID = "anthropic/claude-sonnet-5";
export const ASSISTANT_FAST_MODEL_ID = "openai/gpt-5.6-luna";
export const ASSISTANT_DEEP_MODEL_ID = "anthropic/claude-opus-5";
/** The image designer subagent stays on a fixed model; it never routes. */
export const IMAGE_DESIGNER_MODEL_ID = "anthropic/claude-sonnet-4.6";
export const SONNET_4_6_CONTEXT_WINDOW_TOKENS = 200_000;
export const SONNET_5_CONTEXT_WINDOW_TOKENS = 1_000_000;

/**
 * Choices for the eve `autoModel` evaluator, keyed by gateway model ID. The
 * descriptions are the whole routing policy: the evaluator sees only these
 * plus recent message text, so each one has to cover its slice of the space.
 * Wording was tuned against labelled router cases — see the PR for numbers.
 */
export const ASSISTANT_AUTO_MODEL_OPTIONS = {
  [ASSISTANT_FAST_MODEL_ID]: {
    description:
      "Short, routine turns the assistant answers from general knowledge alone: greetings, acknowledgements, and quick factual or conceptual questions about marketing, writing or software in general. Never pick this when the turn is about the user's own posts, metrics, GEO results, repositories or issues, however short the question is",
    reasoning: "low",
  },
  [ASSISTANT_MODEL_ID]: {
    description:
      "Any turn that changes or inspects the user's own content or connected data: editing a draft, writing or rewriting a post, reading GitHub, Linear or analytics data, publishing, scheduling, or any other tool use",
    reasoning: "low",
  },
  [ASSISTANT_DEEP_MODEL_ID]: {
    description:
      "Demanding turns: long-form writing of roughly a thousand words or more, multi-source research across commits, issues or releases, competitive or strategic analysis, planning a whole content calendar, or nuanced critique and architectural trade-off discussions",
    reasoning: "high",
  },
} as const;

/** Set to `off`, `false` or `0` to pin the assistant to ASSISTANT_MODEL_ID. */
export const AUTO_MODEL_FLAG_ENV = "NOTRA_JEV_CLASSIFIERS";
export const AUTO_MODEL_DISABLED_VALUES: ReadonlySet<string> = new Set([
  "0",
  "false",
  "off",
]);
