export const AI_TRAFFIC_PURPOSES = [
  "training-crawler",
  "search-index",
  "assistant-browse",
  "assistant-referral",
] as const;

export const AI_TRAFFIC_PURPOSE_LABEL_KEYS = {
  "training-crawler": "modelTraining",
  "search-index": "searchIndex",
  "assistant-browse": "citedInAnswer",
  "assistant-referral": "referral",
} as const satisfies Record<(typeof AI_TRAFFIC_PURPOSES)[number], string>;

export const AI_TRAFFIC_CONFIDENCES = [
  "verified",
  "reported",
  "heuristic",
] as const;
