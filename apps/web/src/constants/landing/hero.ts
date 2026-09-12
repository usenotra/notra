import type { HeroCycleWord } from "@/types/landing/hero";

export const HERO_HEADLINE_LINE_ONE = "Your next customer";

export const HERO_HEADLINE_LINE_TWO_PREFIX = "is asking";

export const HERO_HEADLINE_SUFFIX = ".";

export const HERO_HEADLINE_CYCLE: HeroCycleWord[] = [
  { text: "ChatGPT", engine: "chatgpt" },
  { text: "Claude", engine: "claude" },
  { text: "Perplexity", engine: "perplexity" },
  { text: "Gemini", engine: "gemini" },
  { text: "Grok", engine: "grok" },
  { text: "Kimi", engine: "kimi" },
];

export const HERO_HEADLINE_CYCLE_MS = 2600;

export const HERO_SUBHEAD =
  "Notra asks ChatGPT, Claude, Gemini and Perplexity the questions your buyers ask. You see whether you come up, who comes up instead, and what to write about it.";

export const HERO_SIGNUP_SOURCE = "hero";

export const HERO_BOOK_A_CALL_HREF = "/contact";
