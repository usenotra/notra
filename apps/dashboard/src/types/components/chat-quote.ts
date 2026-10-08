import type { Dispatch, SetStateAction, ReactNode } from "react";

import type {
  ChatAnnotation,
  ChatAnnotationFocus,
} from "@/types/chat-annotations";

export interface ChatQuoteProviderProps {
  children: ReactNode;
  conversationId?: string | null;
}

export interface ChatQuotePreviewProps {
  disabled?: boolean;
}

/** A saved post the quoted text came from, e.g. the chat's preview panel. */
export interface ChatQuotePost {
  postId: string;
  title: string;
}

export interface ChatQuoteContextValue {
  scopeId: string;
  quote: string | null;
  setQuote: Dispatch<SetStateAction<string | null>>;
  /** Passages selected in previewed posts, sent with the next message. */
  annotations: ChatAnnotation[];
  setAnnotations: Dispatch<SetStateAction<ChatAnnotation[]>>;
  /** The passage the preview should scroll to and flash. */
  annotationFocus: ChatAnnotationFocus | null;
  focusAnnotation: (target: Omit<ChatAnnotationFocus, "nonce">) => void;
  clearAnnotationFocus: () => void;
}

export interface ChatQuoteSelection {
  text: string;
  /** A copy of the selected range; it outlives the browser selection. */
  range: Range;
  rect: DOMRect;
  post?: ChatQuotePost;
}
