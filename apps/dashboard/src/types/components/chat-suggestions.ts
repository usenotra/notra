import type { IconSvgElement } from "@hugeicons/react";

export type ChatSuggestionId =
  | "blogPost"
  | "releaseNotes"
  | "socialPost"
  | "newsletter"
  | "comparison"
  | "geoStatus"
  | "geoVisibility"
  | "brandVoice"
  | "thread"
  | "faq";

export interface ChatSuggestion {
  id: ChatSuggestionId;
  icon: IconSvgElement;
}

export interface ChatSuggestionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  hidden?: boolean;
  suggestions?: ChatSuggestion[];
  dismissStorageKey?: string;
  layout?: "grid" | "list";
  rotate?: boolean;
  rotateIntervalMs?: number;
  visibleCount?: number;
}

export interface SuggestionCardProps {
  suggestion: ChatSuggestion;
  disabled?: boolean;
  hidden: boolean;
  onSelect: (prompt: string) => void;
  layout: "grid" | "list";
  slotIndex: number;
  reduceMotion: boolean;
}
