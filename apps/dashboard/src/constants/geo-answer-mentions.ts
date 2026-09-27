export const GEO_ANSWER_MENTION_CLASS = {
  own: "rounded-[0.2em] bg-geo-up/20 px-0.5 font-medium text-geo-up",
  competitor: "rounded-[0.2em] bg-geo-mid/20 px-0.5 font-medium text-geo-mid",
} as const;

export const GEO_ANSWER_MENTION_TRIGGER_CLASS =
  "inline cursor-pointer border-0 align-baseline font-[inherit] outline-hidden hover:bg-geo-mid/30 focus-visible:ring-ring/50 focus-visible:ring-2";

export const GEO_ANSWER_MENTION_LIST_ITEM_CLASS =
  "py-1 [&>p:first-child]:inline";
