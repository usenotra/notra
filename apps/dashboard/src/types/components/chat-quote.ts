import type { Dispatch, SetStateAction, ReactNode } from "react";

export interface ChatQuoteProviderProps {
  children: ReactNode;
  conversationId?: string | null;
}

export interface ChatQuotePreviewProps {
  disabled?: boolean;
}

export interface ChatQuoteContextValue {
  scopeId: string;
  quote: string | null;
  setQuote: Dispatch<SetStateAction<string | null>>;
}

export interface ChatQuoteSelection {
  text: string;
  rect: DOMRect;
}
